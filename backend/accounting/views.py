from datetime import timedelta
from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db.models import Q, Sum, Value, DecimalField, ExpressionWrapper, F
from django.db.models.functions import Coalesce
from django.utils import timezone
from django.utils.dateparse import parse_date
from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from django.db import transaction

from accounting.models import (
    Account,
    Alert,
    Customer,
    Expense,
    Invoice,
    InvoiceLine,
    JournalEntry,
    JournalLine,
    Payment,
    CatalogItem,
    StockTransaction,
)

from accounting.serializers import (
    AccountSerializer,
    CustomerSerializer,
    ExpenseAttachmentCreateSerializer,
    ExpenseAttachmentSerializer,
    ExpenseSerializer,
    InvoiceSerializer,
    JournalEntryCreateSerializer,
    JournalEntrySerializer,
    PaymentSerializer,
    CatalogItemSerializer,
    StockTransactionSerializer,
)
from accounting.services.expenses import ensure_expense_journal_entry
from accounting.services.invoices import ensure_invoice_journal_entry
from accounting.services.alerts import generate_alerts
from accounting.services.receivables import get_open_invoices
from accounting.services.primary_accounts import get_expense_account
from accounting.services.payments import record_payment
from core.permissions import HasPermission, PermissionByActionMixin, user_has_permission


def _format_amount(value):
    if value is None:
        value = Decimal("0")
    return f"{Decimal(value):.2f}"


def _parse_date_param(request, param_name):
    value = request.query_params.get(param_name)
    if not value:
        return None
    return parse_date(value)



@extend_schema_view(
    list=extend_schema(tags=["Accounts"], summary="List accounts"),
    retrieve=extend_schema(tags=["Accounts"], summary="Retrieve account"),
)
class AccountViewSet(PermissionByActionMixin, viewsets.ReadOnlyModelViewSet):
    """
    حسابا الشركة (INCOME و EXPENSE) ثابتان وتلقائيان بالكامل - يُنشآن عبر
    signal عند إنشاء الشركة (انظر accounting/signals.py). لا يوجد إنشاء أو
    تعديل أو حذف يدوي لهما، فقط عرض.
    """
    serializer_class = AccountSerializer
    permission_classes = [IsAuthenticated]
    permission_map = {
        "list": "accounting.view",
        "retrieve": "accounting.view",
    }

    def get_queryset(self):
        return Account.objects.filter(company=self.request.user.company)


@extend_schema_view(
    list=extend_schema(tags=["Customers"], summary="List customers"),
    retrieve=extend_schema(tags=["Customers"], summary="Retrieve customer"),
    create=extend_schema(tags=["Customers"], summary="Create customer"),
    partial_update=extend_schema(tags=["Customers"], summary="Update customer"),
)
class CustomerViewSet(PermissionByActionMixin, viewsets.ModelViewSet):
    serializer_class = CustomerSerializer
    permission_classes = [IsAuthenticated]
    permission_map = {
        "list": "customers.view",
        "retrieve": "customers.view",
        "create": "customers.create",
        "partial_update": "customers.edit",
        "update": "customers.edit",
        "destroy": "customers.edit",
    }

    def get_queryset(self):
        queryset = Customer.objects.filter(company=self.request.user.company)
        name = self.request.query_params.get("name")
        code = self.request.query_params.get("code")
        is_active = self.request.query_params.get("is_active")

        if name:
            queryset = queryset.filter(name__icontains=name)
        if code:
            queryset = queryset.filter(code__icontains=code)
        if is_active is not None and is_active != "":
            if is_active.lower() in {"true", "1", "yes"}:
                queryset = queryset.filter(is_active=True)
            elif is_active.lower() in {"false", "0", "no"}:
                queryset = queryset.filter(is_active=False)
        return queryset.order_by("code", "id")

    def perform_create(self, serializer):
        serializer.save(company=self.request.user.company)

    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save(update_fields=["is_active"])


@extend_schema_view(
    list=extend_schema(tags=["Journal Entries"], summary="List journal entries"),
    retrieve=extend_schema(tags=["Journal Entries"], summary="Retrieve journal entry"),
    create=extend_schema(tags=["Journal Entries"], summary="Create journal entry"),
)
class JournalEntryViewSet(PermissionByActionMixin, viewsets.ModelViewSet):
    """
    create() هنا يبقى الطريق الوحيد للقيود اليدوية المتوازنة (Manual Journal
    Entry) بين INCOME و EXPENSE - عبر post_journal_entry(). القيود الناتجة
    تلقائيًا من فواتير/مصروفات/رواتب لا تُنشأ من هنا (انظر Phase 4: invoices.py,
    expenses.py, payroll_journal.py تنشئ JournalEntry مباشرة).
    """
    serializer_class = JournalEntrySerializer
    permission_classes = [IsAuthenticated]
    permission_map = {
        "list": "accounting.journal.view",
        "retrieve": "accounting.journal.view",
        "create": "accounting.journal.post",
        "destroy": "accounting.journal.post",
        "post_entry": "accounting.journal.post",
    }
    http_method_names = ["get", "post", "delete", "head", "options"]
    
    def get_queryset(self):
        queryset = (
            JournalEntry.objects.filter(company=self.request.user.company)
            .select_related("created_by")
            .prefetch_related("lines__account")
        )

        date_from = parse_date(self.request.query_params.get("date_from") or "")
        date_to = parse_date(self.request.query_params.get("date_to") or "")
        reference_type = self.request.query_params.get("reference_type")
        search = self.request.query_params.get("search")

        if date_from:
            queryset = queryset.filter(date__gte=date_from)
        if date_to:
            queryset = queryset.filter(date__lte=date_to)
        if reference_type:
            queryset = queryset.filter(reference_type=reference_type)
        if search:
            queryset = queryset.filter(
                Q(memo__icontains=search) | Q(reference_id__icontains=search)
            )

        return queryset.order_by("-date", "-id")

    def get_serializer_class(self):
        if self.action == "create":
            return JournalEntryCreateSerializer
        return JournalEntrySerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        entry = serializer.save()
        output = JournalEntrySerializer(entry, context={"request": request})
        return Response(output.data, status=status.HTTP_201_CREATED)

    def destroy(self, request, *args, **kwargs):
        entry = self.get_object()
        entry.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["post"], url_path="post")
    def post_entry(self, request, *args, **kwargs):
        entry = self.get_object()
        if entry.status != JournalEntry.Status.DRAFT:
            return Response(
                {"detail": "Journal entry is already posted."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        entry.status = JournalEntry.Status.POSTED
        entry.save(update_fields=["status"])
        serializer = JournalEntrySerializer(entry, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)


@extend_schema_view(
    list=extend_schema(tags=["Invoices"], summary="List invoices"),
    retrieve=extend_schema(tags=["Invoices"], summary="Retrieve invoice"),
    create=extend_schema(tags=["Invoices"], summary="Create invoice"),
    partial_update=extend_schema(tags=["Invoices"], summary="Update invoice"),
)
class InvoiceViewSet(PermissionByActionMixin, viewsets.ModelViewSet):
    serializer_class = InvoiceSerializer
    permission_classes = [IsAuthenticated]
    permission_map = {
        "list": "invoices.*",
        "retrieve": "invoices.*",
        "create": "invoices.*",
        "partial_update": "invoices.*",
        "update": "invoices.*",
        "destroy": "invoices.*",
        "issue": "invoices.*",
        "record_sale": "invoices.*",
    }

    def get_queryset(self):
        total_paid = Coalesce(
            Sum("payments__amount"),
            Value(0),
            output_field=DecimalField(max_digits=14, decimal_places=2),
        )
        remaining_balance = ExpressionWrapper(
            F("total_amount") - total_paid,
            output_field=DecimalField(max_digits=14, decimal_places=2),
        )
        queryset = (            
            Invoice.objects.filter(company=self.request.user.company)
            .select_related("customer", "created_by")
            .annotate(total_paid=total_paid, remaining_balance=remaining_balance)            
        )
        invoice_number = self.request.query_params.get("invoice_number")
        if invoice_number:
            queryset = queryset.filter(invoice_number__icontains=invoice_number)
        return queryset
    
    def perform_create(self, serializer):
        serializer.save()

    def perform_update(self, serializer):
        invoice = serializer.save()
        if invoice.status == Invoice.Status.ISSUED:
            ensure_invoice_journal_entry(invoice)

    @action(detail=False, methods=["post"], url_path="record-sale")
    def record_sale(self, request, *args, **kwargs):
        customer_id = request.data.get("customer")
        customer_name = str(request.data.get("customer_name", "")).strip()
        customer_payload = request.data.get("customer_data") or {}
        item_id = request.data.get("item")
        quantity = Decimal(str(request.data.get("quantity", "1")))
        lines_payload = request.data.get("items") or []
        invoice_number = request.data.get("invoice_number")
        issue_date = parse_date(request.data.get("issue_date") or "") or timezone.now().date()
        due_date = parse_date(request.data.get("due_date") or "")
        tax_amount = Decimal(str(request.data.get("tax_amount", "0")))
        amount_paid = Decimal(str(request.data.get("amount_paid", "0")))
        notes = request.data.get("notes", "")
        payment_method = request.data.get("payment_method", "auto")
        expense_vendor_name = request.data.get("expense_vendor_name", "")

        parsed_lines = []
        if lines_payload:
            for raw_line in lines_payload:
                try:
                    line_item = CatalogItem.objects.get(
                        id=raw_line.get("item"), company=request.user.company, is_active=True
                    )
                except CatalogItem.DoesNotExist:
                    return Response({"detail": "One or more catalog items were not found."}, status=status.HTTP_400_BAD_REQUEST)
                line_quantity = Decimal(str(raw_line.get("quantity", "1")))
                if line_quantity <= 0:
                    return Response({"detail": "Line quantity must be greater than zero."}, status=status.HTTP_400_BAD_REQUEST)
                unit_price = Decimal(str(raw_line.get("unit_price", line_item.sale_price)))
                parsed_lines.append(
                    {
                        "item": line_item,
                        "quantity": line_quantity,
                        "unit_price": unit_price,
                    }
                )
        else:
            if quantity <= 0:
                return Response({"detail": "quantity must be greater than zero."}, status=status.HTTP_400_BAD_REQUEST)
            try:
                line_item = CatalogItem.objects.get(id=item_id, company=request.user.company, is_active=True)
            except CatalogItem.DoesNotExist:
                return Response({"detail": "Catalog item not found."}, status=status.HTTP_400_BAD_REQUEST)
            parsed_lines = [{"item": line_item, "quantity": quantity, "unit_price": line_item.sale_price}]
            
        customer = None
        if customer_id:
            customer = Customer.objects.filter(id=customer_id, company=request.user.company).first()
            if not customer:
                return Response({"detail": "Customer not found."}, status=status.HTTP_400_BAD_REQUEST)
        elif customer_name:
            customer = Customer.objects.filter(company=request.user.company, name__iexact=customer_name).first()
            if not customer:
                return Response({"detail": "Customer name not found. Send customer_data to create one."}, status=status.HTTP_400_BAD_REQUEST)
        elif customer_payload:
            customer = Customer.objects.filter(
                company=request.user.company,
                code=customer_payload.get("code"),
            ).first()
            if not customer:
                customer = Customer.objects.create(
                    company=request.user.company,
                    code=customer_payload.get("code", ""),
                    name=customer_payload.get("name", ""),
                    email=customer_payload.get("email") or None,
                    phone=customer_payload.get("phone") or None,
                    address=customer_payload.get("address") or None,
                    credit_limit=customer_payload.get("credit_limit") or None,
                    payment_terms_days=customer_payload.get("payment_terms_days", 0),
                    is_active=bool(customer_payload.get("is_active", True)),
                )
        if not customer:
            return Response({"detail": "A customer selection or customer_data is required."}, status=status.HTTP_400_BAD_REQUEST)
        
        for line in parsed_lines:
            if line["item"].item_type == CatalogItem.ItemType.PRODUCT and line["item"].stock_quantity < line["quantity"]:
                return Response(
                    {"detail": f"Insufficient stock quantity for {line['item'].name}."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
                
        subtotal = sum((line["quantity"] * line["unit_price"] for line in parsed_lines), Decimal("0"))        
        total_amount = subtotal + tax_amount
        due_date = due_date or (issue_date + timedelta(days=customer.payment_terms_days))
        
        try:
            with transaction.atomic():
                invoice = Invoice.objects.create(
                    company=request.user.company,
                    invoice_number=invoice_number,
                    customer=customer,
                    issue_date=issue_date,
                    due_date=due_date,
                    status=Invoice.Status.ISSUED,
                    subtotal=subtotal,
                    tax_amount=tax_amount,
                    total_amount=total_amount,
                    notes=notes or "Auto sale invoice",                    
                    created_by=request.user,
                )
                invoice_lines = []
                for line in parsed_lines:
                    invoice_lines.append(
                        InvoiceLine(
                            invoice=invoice,
                            description=line["item"].name,
                            quantity=line["quantity"],
                            unit_price=line["unit_price"],
                            line_total=line["quantity"] * line["unit_price"],
                        )
                    )
                InvoiceLine.objects.bulk_create(invoice_lines)                
                ensure_invoice_journal_entry(invoice)

                for line in parsed_lines:
                    item = line["item"]
                    if item.item_type == CatalogItem.ItemType.PRODUCT:
                        item.stock_quantity = item.stock_quantity - line["quantity"]
                        item.save(update_fields=["stock_quantity", "updated_at"])
                        
                    StockTransaction.objects.create(
                        company=request.user.company,
                        item=item,
                        transaction_type=StockTransaction.TransactionType.SALE,
                        quantity_delta=(-line["quantity"] if item.item_type == CatalogItem.ItemType.PRODUCT else Decimal("0")),
                        unit_cost=item.cost_price,
                        unit_price=line["unit_price"],
                        memo=f"Sale invoice {invoice.invoice_number}",
                        invoice=invoice,
                        created_by=request.user,
                    )
                    
                # تكلفة البضاعة المباعة (COGS) - مصروف فعلي مستقل، حساب
                # EXPENSE الموحّد يُحدَّد تلقائيًا دائمًا (لا يوجد اختيار
                # يدوي لحساب التكلفة أو حساب الدفع بعد الآن).
                cogs_amount = sum((line["quantity"] * line["item"].cost_price for line in parsed_lines), Decimal("0"))                
                if cogs_amount > 0:
                    cogs_account = get_expense_account(request.user.company)
                    line_types = {line["item"].item_type for line in parsed_lines}
                    is_service_only = line_types == {CatalogItem.ItemType.SERVICE}
                    category = "إعلانات" if is_service_only else "تكلفة شراء منتج"
                    vendor_name = expense_vendor_name or ("جهة الإعلانات" if is_service_only else "جهة شراء منتج")                    
                    expense = Expense.objects.create(
                        company=request.user.company,
                        date=issue_date,
                        vendor_name=vendor_name,
                        category=category,                        
                        amount=cogs_amount,
                        currency="",
                        payment_method=payment_method,
                        expense_account=cogs_account,
                        notes=f"{category} - linked to invoice {invoice.invoice_number}",                        
                        status=Expense.Status.APPROVED,
                        created_by=request.user,
                    )
                    ensure_expense_journal_entry(expense)

                if amount_paid > 0:
                    payment = Payment.objects.create(
                        company=request.user.company,
                        customer=customer,
                        invoice=invoice,
                        payment_date=issue_date,
                        amount=amount_paid,
                        method=Payment.Method.CASH,
                        notes="Auto payment while recording sale",
                        created_by=request.user,
                    )
                    record_payment(payment)

        except ValidationError as exc:
            return Response({"detail": exc.messages}, status=status.HTTP_400_BAD_REQUEST)

        serializer = self.get_serializer(invoice)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="issue")
    def issue(self, request, *args, **kwargs):
        invoice = self.get_object()
        if invoice.status != Invoice.Status.DRAFT:
            return Response(
                {"detail": "Invoice is already issued."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not invoice.lines.exists():
            return Response(
                {"detail": "Invoice must include at least one line item before issuing."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            with transaction.atomic():
                invoice.status = Invoice.Status.ISSUED
                invoice.save(update_fields=["status"])
                ensure_invoice_journal_entry(invoice)
        except ValidationError as exc:
            return Response({"detail": exc.messages}, status=status.HTTP_400_BAD_REQUEST)
        serializer = self.get_serializer(invoice)
        return Response(serializer.data, status=status.HTTP_200_OK)



@extend_schema_view(
    list=extend_schema(tags=["Expenses"], summary="List expenses"),
    retrieve=extend_schema(tags=["Expenses"], summary="Retrieve expense"),
    create=extend_schema(tags=["Expenses"], summary="Create expense"),
    partial_update=extend_schema(tags=["Expenses"], summary="Update expense"),
)
class ExpenseViewSet(PermissionByActionMixin, viewsets.ModelViewSet):
    serializer_class = ExpenseSerializer
    permission_classes = [IsAuthenticated]
    permission_map = {
        "list": "expenses.view",
        "retrieve": "expenses.view",
        "create": "expenses.create",
        "partial_update": "expenses.create",
        "update": "expenses.create",
        "approve": "expenses.approve",
        "attachments": "expenses.create",
    }

    def get_queryset(self):
        queryset = (
            Expense.objects.filter(company=self.request.user.company)
            .select_related(
                "expense_account",
                "created_by",
            )
        )        
        date_from = parse_date(self.request.query_params.get("date_from") or "")
        date_to = parse_date(self.request.query_params.get("date_to") or "")
        vendor = self.request.query_params.get("vendor")
        amount_min = self.request.query_params.get("amount_min")
        amount_max = self.request.query_params.get("amount_max")

        if date_from:
            queryset = queryset.filter(date__gte=date_from)
        if date_to:
            queryset = queryset.filter(date__lte=date_to)
        if vendor:
            queryset = queryset.filter(vendor_name__icontains=vendor)
        if amount_min:
            queryset = queryset.filter(amount__gte=amount_min)
        if amount_max:
            queryset = queryset.filter(amount__lte=amount_max)
        return queryset.order_by("-date", "-id")

    def perform_create(self, serializer):
        status_value = serializer.validated_data.get("status", Expense.Status.DRAFT)
        if status_value == Expense.Status.APPROVED and not user_has_permission(
            self.request.user, "expenses.approve"
        ):
            raise PermissionError("You do not have permission to approve expenses.")
        expense = serializer.save(company=self.request.user.company, created_by=self.request.user)
        ensure_expense_journal_entry(expense)
        
    def perform_update(self, serializer):
        expense = self.get_object()
        if expense.status == Expense.Status.APPROVED:
            raise PermissionError("Approved expenses cannot be edited.")
        status_value = serializer.validated_data.get("status", expense.status)
        if status_value == Expense.Status.APPROVED and not user_has_permission(
            self.request.user, "expenses.approve"
        ):
            raise PermissionError("You do not have permission to approve expenses.")
        expense = serializer.save()
        ensure_expense_journal_entry(expense)
        
    def handle_exception(self, exc):
        if isinstance(exc, PermissionError):
            return Response({"detail": str(exc)}, status=status.HTTP_403_FORBIDDEN)
        return super().handle_exception(exc)

    @action(detail=True, methods=["post"])
    def approve(self, request, *args, **kwargs):
        expense = self.get_object()
        if expense.status == Expense.Status.APPROVED:
            return Response(
                {"detail": "Expense is already approved."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        expense.status = Expense.Status.APPROVED
        expense.save(update_fields=["status"])
        ensure_expense_journal_entry(expense)
        serializer = ExpenseSerializer(expense, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], url_path="attachments")
    def attachments(self, request, *args, **kwargs):
        expense = self.get_object()
        serializer = ExpenseAttachmentCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        attachment = serializer.save(
            expense=expense,
            uploaded_by=request.user,
        )
        output = ExpenseAttachmentSerializer(attachment, context={"request": request})
        return Response(output.data, status=status.HTTP_201_CREATED)



@extend_schema_view(
    list=extend_schema(tags=["Payments"], summary="List payments"),
    retrieve=extend_schema(tags=["Payments"], summary="Retrieve payment"),
    create=extend_schema(tags=["Payments"], summary="Create payment"),
)
class PaymentViewSet(PermissionByActionMixin, viewsets.ModelViewSet):
    serializer_class = PaymentSerializer
    permission_classes = [IsAuthenticated]
    permission_map = {
        "list": ["payments.*", "accounting.*"],
        "retrieve": ["payments.*", "accounting.*"],
        "create": ["payments.*", "accounting.*"],        
    }

    def get_queryset(self):
        queryset = Payment.objects.filter(company=self.request.user.company).select_related(
            "customer", "invoice", "created_by"
        )
        customer_id = self.request.query_params.get("customer")
        if customer_id:
            queryset = queryset.filter(customer_id=customer_id)
        return queryset.order_by("-payment_date", "-id")


@extend_schema_view(
    list=extend_schema(tags=["Catalog"], summary="List products/services"),
    retrieve=extend_schema(tags=["Catalog"], summary="Retrieve product/service"),
    create=extend_schema(tags=["Catalog"], summary="Create product/service"),
    partial_update=extend_schema(tags=["Catalog"], summary="Update product/service"),
)
class CatalogItemViewSet(PermissionByActionMixin, viewsets.ModelViewSet):
    serializer_class = CatalogItemSerializer
    permission_classes = [IsAuthenticated]
    permission_map = {
        "list": ["catalog.view", "accounting.*"],
        "retrieve": ["catalog.view", "accounting.*"],
        "create": ["catalog.create", "accounting.*"],
        "partial_update": ["catalog.edit", "accounting.*"],
        "update": ["catalog.edit", "accounting.*"],
        "destroy": ["catalog.delete", "accounting.*"],
        "add_stock": ["catalog.edit", "accounting.*"],
        "remove_stock": ["catalog.edit", "accounting.*"],
    }

    def get_queryset(self):
        queryset = CatalogItem.objects.filter(company=self.request.user.company)
        item_type = self.request.query_params.get("item_type")
        if item_type:
            queryset = queryset.filter(item_type=item_type)
        return queryset.order_by("name", "id")

    def perform_create(self, serializer):
        serializer.save(company=self.request.user.company, created_by=self.request.user)

    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save(update_fields=["is_active", "updated_at"])
        StockTransaction.objects.create(
            company=self.request.user.company,
            item=instance,
            transaction_type=StockTransaction.TransactionType.DELETE,
            quantity_delta=0,
            unit_cost=instance.cost_price,
            unit_price=instance.sale_price,
            memo="Soft delete catalog item",
            created_by=self.request.user,
        )

    @action(detail=True, methods=["post"], url_path="add-stock")
    def add_stock(self, request, *args, **kwargs):
        item = self.get_object()
        quantity = Decimal(str(request.data.get("quantity", "0")))
        memo = request.data.get("memo", "")
        if item.item_type != CatalogItem.ItemType.PRODUCT:
            return Response({"detail": "Stock can be added only to product items."}, status=status.HTTP_400_BAD_REQUEST)
        if quantity <= 0:
            return Response({"detail": "Quantity must be greater than zero."}, status=status.HTTP_400_BAD_REQUEST)
        item.stock_quantity = (item.stock_quantity or Decimal("0")) + quantity
        item.save(update_fields=["stock_quantity", "updated_at"])
        tx = StockTransaction.objects.create(
            company=request.user.company,
            item=item,
            transaction_type=StockTransaction.TransactionType.STOCK_IN,
            quantity_delta=quantity,
            unit_cost=item.cost_price,
            unit_price=item.sale_price,
            memo=memo or "Stock in",
            created_by=request.user,
        )
        return Response(StockTransactionSerializer(tx, context={"request": request}).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="remove-stock")
    def remove_stock(self, request, *args, **kwargs):
        item = self.get_object()
        quantity = Decimal(str(request.data.get("quantity", "0")))
        memo = request.data.get("memo", "")
        reason = request.data.get("reason", "")
        if item.item_type != CatalogItem.ItemType.PRODUCT:
            return Response({"detail": "Stock can be removed only from product items."}, status=status.HTTP_400_BAD_REQUEST)
        if quantity <= 0:
            return Response({"detail": "Quantity must be greater than zero."}, status=status.HTTP_400_BAD_REQUEST)
        if item.stock_quantity < quantity:
            return Response({"detail": "Insufficient stock quantity."}, status=status.HTTP_400_BAD_REQUEST)
        item.stock_quantity = (item.stock_quantity or Decimal("0")) - quantity
        item.save(update_fields=["stock_quantity", "updated_at"])
        tx = StockTransaction.objects.create(
            company=request.user.company,
            item=item,
            transaction_type=StockTransaction.TransactionType.STOCK_OUT,
            quantity_delta=-quantity,
            unit_cost=item.cost_price,
            unit_price=item.sale_price,
            memo=memo or reason or "Stock out",
            created_by=request.user,
        )
        return Response(StockTransactionSerializer(tx, context={"request": request}).data, status=status.HTTP_201_CREATED)
    
@extend_schema_view(
    list=extend_schema(tags=["Inventory"], summary="List stock transactions"),
    retrieve=extend_schema(tags=["Inventory"], summary="Retrieve stock transaction"),
)
class StockTransactionViewSet(PermissionByActionMixin, viewsets.ReadOnlyModelViewSet):
    serializer_class = StockTransactionSerializer
    permission_classes = [IsAuthenticated]
    permission_map = {
        "list": ["catalog.view", "accounting.*"],
        "retrieve": ["catalog.view", "accounting.*"],
    }

    def get_queryset(self):
        queryset = StockTransaction.objects.filter(company=self.request.user.company).select_related("item", "created_by", "invoice")
        tx_type = self.request.query_params.get("transaction_type")
        if tx_type:
            queryset = queryset.filter(transaction_type=tx_type)
        return queryset.order_by("-created_at", "-id")



@extend_schema(tags=["Reports"], summary="Accounts receivable aging")
class ARAgingReportView(APIView):
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        permissions = super().get_permissions()
        permissions.append(HasPermission("accounting.reports.view"))
        return permissions

    def get(self, request):
        today = timezone.now().date()
        invoices = get_open_invoices(request.user.company).select_related("customer")
        customers = {}
        for invoice in invoices:
            days_overdue = max(0, (today - invoice.due_date).days)            
            if days_overdue <= 30:
                bucket = "0_30"
            elif days_overdue <= 60:
                bucket = "31_60"
            elif days_overdue <= 90:
                bucket = "61_90"
            else:
                bucket = "90_plus"

            entry = customers.setdefault(
                invoice.customer_id,
                {
                    "customer": {
                        "id": invoice.customer_id,
                        "name": invoice.customer.name,
                    },
                    "total_due": Decimal("0"),
                    "buckets": {
                        "0_30": Decimal("0"),
                        "31_60": Decimal("0"),
                        "61_90": Decimal("0"),
                        "90_plus": Decimal("0"),
                    },
                },
            )
            entry["buckets"][bucket] += Decimal(invoice.remaining_balance)
            entry["total_due"] += Decimal(invoice.remaining_balance)

        data = []
        for entry in sorted(customers.values(), key=lambda item: item["customer"]["name"]):
            data.append(
                {
                    "customer": entry["customer"],
                    "total_due": _format_amount(entry["total_due"]),
                    "buckets": {
                        key: _format_amount(value)
                        for key, value in entry["buckets"].items()
                    },
                }
            )
        return Response(data, status=status.HTTP_200_OK)


@extend_schema(tags=["Reports"], summary="Accounts receivable alerts")
class AlertsView(APIView):
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        permissions = super().get_permissions()
        permissions.append(HasPermission("accounting.reports.view"))
        return permissions

    def get(self, request):
        overdue_days = request.query_params.get("overdue_days")
        if overdue_days:
            try:
                overdue_days_value = int(overdue_days)
            except ValueError:
                return Response(
                    {"detail": "overdue_days must be an integer."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        else:
            overdue_days_value = 30

        generate_alerts(request.user.company, overdue_days=overdue_days_value)
        alerts = Alert.objects.filter(company=request.user.company).order_by("-created_at")
        data = [
            {
                "id": alert.id,
                "type": alert.type,
                "entity_id": alert.entity_id,
                "severity": alert.severity,
                "message": alert.message,
                "created_at": alert.created_at.isoformat(),
            }
            for alert in alerts
        ]
        return Response(data, status=status.HTTP_200_OK)


# ==========================================================================
# PHASE 6 — تبسيط التقارير. الأربعة تقارير التالية تعمل الآن فقط على حسابين
# (INCOME, EXPENSE) بدلاً من شجرة حسابات كاملة. كل الإشارات لـ account__code/
# account__name/cost_center (محذوفة من الموديلات في Phase 1) أُزيلت بالكامل.
# ==========================================================================

@extend_schema(tags=["Reports"], summary="Trial balance")
class TrialBalanceView(APIView):
    """
    بما أن النظام يحتوي فقط على حسابي INCOME/EXPENSE، أصبح Trial Balance
    تقريرًا بسيطًا بعنصرين فقط: رصيد كل حساب (net = debit - credit) خلال
    الفترة المطلوبة. group by أصبح على account__type بدل account__code
    (المحذوف).
    """
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        permissions = super().get_permissions()
        permissions.append(HasPermission("accounting.reports.view"))
        return permissions

    def get(self, request):
        date_from = _parse_date_param(request, "date_from")
        date_to = _parse_date_param(request, "date_to")
        if not date_from or not date_to:
            return Response(
                {"detail": "date_from and date_to are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if date_from > date_to:
            return Response(
                {"detail": "date_from must be before date_to."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        lines = (
            JournalLine.objects.filter(
                company=request.user.company,
                entry__status=JournalEntry.Status.POSTED,
                entry__date__gte=date_from,
                entry__date__lte=date_to,
            )
            .values("account_id", "account__type")
            .annotate(
                debit=Coalesce(
                    Sum("debit"), Value(0), output_field=DecimalField(max_digits=14, decimal_places=2)
                ),
                credit=Coalesce(
                    Sum("credit"), Value(0), output_field=DecimalField(max_digits=14, decimal_places=2)
                ),
            )
            .order_by("account__type")
        )

        data = []
        for row in lines:
            debit_total = row["debit"] or Decimal("0")
            credit_total = row["credit"] or Decimal("0")

            # Trial Balance should show BALANCE (net), not totals
            net = debit_total - credit_total

            debit_balance = Decimal("0")
            credit_balance = Decimal("0")

            if net > 0:
                debit_balance = net
            elif net < 0:
                credit_balance = -net

            data.append(
                {
                    "account_id": row["account_id"],
                    "type": row["account__type"],

                    # ✅ balances (what the page should display)
                    "debit": _format_amount(debit_balance),
                    "credit": _format_amount(credit_balance),

                    # ✅ optional: totals (useful for audits / later UI)
                    "debit_total": _format_amount(debit_total),
                    "credit_total": _format_amount(credit_total),
                    "net": _format_amount(net),
                }
            )

        return Response(data, status=status.HTTP_200_OK)


@extend_schema(tags=["Reports"], summary="General ledger")
class GeneralLedgerView(APIView):
    """
    account_id الممرر هنا دائمًا أحد حسابي الشركة فقط (INCOME أو EXPENSE).
    منطق running_balance لم يتغير - فقط أُزيلت كل إشارة لـ cost_center
    (محذوف من JournalLine) وaccount.code/account.name (محذوفان من Account).
    """
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        permissions = super().get_permissions()
        permissions.append(HasPermission("accounting.reports.view"))
        return permissions

    def get(self, request):
        account_id = request.query_params.get("account_id")
        date_from = _parse_date_param(request, "date_from")
        date_to = _parse_date_param(request, "date_to")
        if not account_id or not date_from or not date_to:
            return Response(
                {"detail": "account_id, date_from, and date_to are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if date_from > date_to:
            return Response(
                {"detail": "date_from must be before date_to."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        account = Account.objects.filter(company=request.user.company, id=account_id).first()
        if not account:
            return Response({"detail": "Account not found."}, status=status.HTTP_404_NOT_FOUND)

        journal_lines = (
            JournalLine.objects.filter(
                company=request.user.company,
                account=account,
                entry__status=JournalEntry.Status.POSTED,
                entry__date__gte=date_from,
                entry__date__lte=date_to,
            )
            .select_related("entry")
            .order_by("entry__date", "id")
        )

        running_balance = Decimal("0")
        lines = []
        for line in journal_lines:
            running_balance += (line.debit - line.credit)
            lines.append(
                {
                    "id": line.id,
                    "date": line.entry.date.isoformat(),
                    "description": line.description,
                    "debit": _format_amount(line.debit),
                    "credit": _format_amount(line.credit),
                    "memo": line.entry.memo,
                    "reference_type": line.entry.reference_type,
                    "reference_id": line.entry.reference_id,
                    "running_balance": _format_amount(running_balance),
                }
            )

        return Response(
            {
                "account": {
                    "id": account.id,
                    "type": account.type,
                },
                "lines": lines,
            },
            status=status.HTTP_200_OK,
        )


@extend_schema(tags=["Reports"], summary="Profit and loss")
class ProfitLossView(APIView):
    """
    بسيط ومباشر الآن: حساب واحد INCOME وحساب واحد EXPENSE فقط، بدون أي
    تقسيمات فرعية. حُذف بالكامل قسم "Cash-basis revenue support" الذي كان
    يجمع Payment.amount كإيراد إضافي - الإيراد الفعلي يُسجَّل بالكامل في
    JournalLine عند issue الفاتورة (انظر Phase 4: invoices.py)، فإضافة
    قيمة الدفعات هنا كانت ستؤدي لاحتساب الإيراد مرتين (نفس المنطق المتفق
    عليه في قرار Payment بدون قيد محاسبي في Phase 4).
    """
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        permissions = super().get_permissions()
        permissions.append(HasPermission("accounting.reports.view"))
        return permissions

    def get(self, request):
        date_from = _parse_date_param(request, "date_from")
        date_to = _parse_date_param(request, "date_to")
        if not date_from or not date_to:
            return Response(
                {"detail": "date_from and date_to are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if date_from > date_to:
            return Response(
                {"detail": "date_from must be before date_to."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        rows = (
            JournalLine.objects.filter(
                company=request.user.company,
                entry__status=JournalEntry.Status.POSTED,
                entry__date__gte=date_from,
                entry__date__lte=date_to,
            )
            .values("account_id", "account__type")
            .annotate(
                debit=Coalesce(
                    Sum("debit"), Value(0), output_field=DecimalField(max_digits=14, decimal_places=2)
                ),
                credit=Coalesce(
                    Sum("credit"), Value(0), output_field=DecimalField(max_digits=14, decimal_places=2)
                ),
            )
        )

        income_account = None
        expense_account = None
        income_total = Decimal("0")
        expense_total = Decimal("0")

        for row in rows:
            debit = Decimal(row["debit"])
            credit = Decimal(row["credit"])
            account_type = row["account__type"]

            if account_type == Account.Type.INCOME:
                net = credit - debit
                income_total += net
                income_account = {
                    "account_id": row["account_id"],
                    "type": Account.Type.INCOME,
                    "debit": _format_amount(debit),
                    "credit": _format_amount(credit),
                    "net": _format_amount(net),
                }
            else:
                net = debit - credit
                expense_total += net
                expense_account = {
                    "account_id": row["account_id"],
                    "type": Account.Type.EXPENSE,
                    "debit": _format_amount(debit),
                    "credit": _format_amount(credit),
                    "net": _format_amount(net),
                }

        net_profit = income_total - expense_total

        return Response(
            {
                "date_from": date_from.isoformat(),
                "date_to": date_to.isoformat(),
                "income_total": _format_amount(income_total),
                "expense_total": _format_amount(expense_total),
                "net_profit": _format_amount(net_profit),
                "income_account": income_account,
                "expense_account": expense_account,
            },
            status=status.HTTP_200_OK,
        )


@extend_schema(tags=["Reports"], summary="Cumulative balance summary")
class BalanceSheetView(APIView):
    """
    تحويل جوهري (قرار معتمد رسميًا في Phase 6): الـ endpoint القديم كان
    يحاكي Balance Sheet كلاسيكي (Assets = Liabilities + Equity) بشكل غير
    منطقي محاسبيًا حتى في النظام السابق (كان يسمي INCOME/EXPENSE بـ
    assets/liabilities). في النظام المبسط بحسابين فقط، لا معنى لمصطلحات
    Assets/Liabilities/Equity على الإطلاق.

    الـ endpoint أصبح تقرير "ملخص تراكمي" (Cumulative Balance Summary):
    إجمالي INCOME التراكمي حتى as_of، إجمالي EXPENSE التراكمي حتى as_of،
    والفارق (صافي الرصيد التراكمي منذ تأسيس الشركة وحتى التاريخ المطلوب).
    هذا هو المعنى المنطقي الوحيد القابل للتطبيق بهذا الاسم في نظام بحسابين.

    اسم الكلاس (BalanceSheetView) ومسار الـ route (reports/balance-sheet/)
    أُبقيا كما هما لتفادي كسر أي استدعاء موجود من الفرونت إند بشكل غير
    ضروري في هذا الـ Phase (التغيير الكامل للمسار/الاسم إن رغب فيه أحمد
    يمكن تأجيله لـ Phase 7 عند تحديث الواجهة، إذ سيحتاج تنسيقًا متزامنًا
    مع تسمية الصفحة BalanceSheetPage.tsx على أي حال).
    """
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        permissions = super().get_permissions()
        permissions.append(HasPermission("accounting.reports.view"))
        return permissions

    def get(self, request):
        as_of = _parse_date_param(request, "as_of")
        if not as_of:
            return Response(
                {"detail": "as_of is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        rows = (
            JournalLine.objects.filter(
                company=request.user.company,
                entry__status=JournalEntry.Status.POSTED,
                entry__date__lte=as_of,
            )
            .values("account__type")
            .annotate(
                debit=Coalesce(
                    Sum("debit"), Value(0), output_field=DecimalField(max_digits=14, decimal_places=2)
                ),
                credit=Coalesce(
                    Sum("credit"), Value(0), output_field=DecimalField(max_digits=14, decimal_places=2)
                ),
            )
        )

        income_total = Decimal("0")
        expense_total = Decimal("0")

        for row in rows:
            debit = Decimal(row["debit"])
            credit = Decimal(row["credit"])
            if row["account__type"] == Account.Type.INCOME:
                income_total = credit - debit
            else:
                expense_total = debit - credit

        net_balance = income_total - expense_total

        return Response(
            {
                "as_of": as_of.isoformat(),
                "cumulative_income": _format_amount(income_total),
                "cumulative_expense": _format_amount(expense_total),
                "net_balance": _format_amount(net_balance),
            },
            status=status.HTTP_200_OK,
        )