from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import Q


class Customer(models.Model):
    company = models.ForeignKey(
        "core.Company",
        on_delete=models.CASCADE,
        related_name="customers",
    )
    code = models.CharField(max_length=32)
    name = models.CharField(max_length=255)
    email = models.EmailField(blank=True, null=True)
    phone = models.CharField(max_length=50, blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    credit_limit = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        blank=True,
        null=True,
    )
    payment_terms_days = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["company", "code"],
                name="unique_customer_code_per_company",
            ),
        ]

    def __str__(self):
        return f"{self.code} - {self.name}"


class Account(models.Model):
    class Type(models.TextChoices):
        INCOME = "INCOME", "Income"
        EXPENSE = "EXPENSE", "Expense"

    company = models.ForeignKey(
        "core.Company",
        on_delete=models.CASCADE,
        related_name="accounts",
    )
    type = models.CharField(max_length=20, choices=Type.choices)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["company", "type"],
                name="unique_account_type_per_company",
            ),
        ]

    def __str__(self):
        return f"{self.company.name} - {self.type}"


class Invoice(models.Model):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        ISSUED = "issued", "Issued"
        PARTIALLY_PAID = "partially_paid", "Partially Paid"
        PAID = "paid", "Paid"
        VOID = "void", "Void"

    company = models.ForeignKey(
        "core.Company",
        on_delete=models.CASCADE,
        related_name="invoices",
    )
    invoice_number = models.CharField(max_length=64)
    customer = models.ForeignKey(
        "accounting.Customer",
        on_delete=models.PROTECT,
        related_name="invoices",
    )
    issue_date = models.DateField()
    due_date = models.DateField()
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.DRAFT,
    )
    subtotal = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    tax_rate = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Tax percentage applied to subtotal.",
    )
    tax_amount = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        null=True,
        blank=True,
    )
    total_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey(
        "core.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="invoices",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["company", "invoice_number"],
                name="unique_invoice_number_per_company",
            ),
        ]

    def __str__(self):
        return f"{self.company.name} - Invoice {self.invoice_number}"


class InvoiceLine(models.Model):
    invoice = models.ForeignKey(
        "accounting.Invoice",
        on_delete=models.CASCADE,
        related_name="lines",
    )
    description = models.CharField(max_length=255)
    quantity = models.DecimalField(max_digits=14, decimal_places=2)
    unit_price = models.DecimalField(max_digits=14, decimal_places=2)
    line_total = models.DecimalField(max_digits=14, decimal_places=2)

    def __str__(self):
        return f"{self.invoice_id} - {self.description}"


class Payment(models.Model):
    class Method(models.TextChoices):
        CASH = "cash", "Cash"
        BANK = "bank", "Bank"

    company = models.ForeignKey(
        "core.Company",
        on_delete=models.CASCADE,
        related_name="payments",
    )
    customer = models.ForeignKey(
        "accounting.Customer",
        on_delete=models.PROTECT,
        related_name="payments",
    )
    invoice = models.ForeignKey(
        "accounting.Invoice",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="payments",
    )
    payment_date = models.DateField()
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    method = models.CharField(max_length=16, choices=Method.choices)
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey(
        "core.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="payments",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.company.name} - Payment {self.id}"


class Alert(models.Model):
    class Type(models.TextChoices):
        OVERDUE_INVOICE = "overdue_invoice", "Overdue Invoice"
        CREDIT_LIMIT = "credit_limit", "Credit Limit"

    class Severity(models.TextChoices):
        LOW = "low", "Low"
        HIGH = "high", "High"

    company = models.ForeignKey(
        "core.Company",
        on_delete=models.CASCADE,
        related_name="alerts",
    )
    type = models.CharField(max_length=32, choices=Type.choices)
    entity_id = models.CharField(max_length=64)
    severity = models.CharField(max_length=16, choices=Severity.choices)
    message = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["company", "type", "entity_id"],
                name="unique_alert_per_company_entity",
            ),
        ]

    def __str__(self):
        return f"{self.company.name} - {self.type} - {self.entity_id}"


class JournalEntry(models.Model):
    class ReferenceType(models.TextChoices):
        MANUAL = "manual", "Manual"
        PAYROLL = "payroll", "Payroll"
        PAYROLL_PERIOD = "payroll_period", "Payroll Period"
        EXPENSE = "expense", "Expense"
        INVOICE = "invoice", "Invoice"
        PAYMENT = "payment", "Payment"
        ADJUSTMENT = "adjustment", "Adjustment"

    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        POSTED = "posted", "Posted"

    company = models.ForeignKey(
        "core.Company",
        on_delete=models.CASCADE,
        related_name="journal_entries",
    )
    date = models.DateField()
    reference_type = models.CharField(
        max_length=32,
        choices=ReferenceType.choices,
        default=ReferenceType.MANUAL,
    )
    reference_id = models.CharField(max_length=64, null=True, blank=True)
    memo = models.TextField(blank=True)
    status = models.CharField(
        max_length=16,
        choices=Status.choices,
        default=Status.POSTED,
    )
    created_by = models.ForeignKey(
        "core.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="journal_entries",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=["company", "date"]),
            models.Index(fields=["company", "reference_type", "reference_id"]),
        ]

    def __str__(self):
        return f"{self.company.name} - {self.date} - {self.reference_type}"


class JournalLine(models.Model):
    company = models.ForeignKey(
        "core.Company",
        on_delete=models.CASCADE,
        related_name="journal_lines",
    )
    entry = models.ForeignKey(
        "accounting.JournalEntry",
        on_delete=models.CASCADE,
        related_name="lines",
    )
    account = models.ForeignKey(
        "accounting.Account",
        on_delete=models.PROTECT,
        related_name="journal_lines",
    )
    description = models.CharField(max_length=255, blank=True)
    debit = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    credit = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.CheckConstraint(
                check=(
                    (Q(debit__gt=0) & Q(credit=0))
                    | (Q(credit__gt=0) & Q(debit=0))
                ),
                name="journal_line_single_sided_amount",
            ),
        ]

    def clean(self):
        if self.debit and self.credit:
            raise ValidationError("Journal line must not have both debit and credit.")
        if self.debit <= 0 and self.credit <= 0:
            raise ValidationError("Journal line must have a debit or credit amount.")
        if self.account and self.account.company_id != self.company_id:
            raise ValidationError("Account must belong to the same company.")

    def __str__(self):
        return f"{self.entry_id} - {self.account.type}"


class Expense(models.Model):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        APPROVED = "approved", "Approved"

    company = models.ForeignKey(
        "core.Company",
        on_delete=models.CASCADE,
        related_name="expenses",
    )
    date = models.DateField()
    vendor_name = models.CharField(max_length=255, blank=True)
    category = models.CharField(max_length=255, blank=True)
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    currency = models.CharField(max_length=16, blank=True)
    payment_method = models.CharField(max_length=32, blank=True)
    expense_account = models.ForeignKey(
        "accounting.Account",
        on_delete=models.PROTECT,
        related_name="expense_postings",
    )
    notes = models.TextField(blank=True)
    status = models.CharField(
        max_length=16,
        choices=Status.choices,
        default=Status.DRAFT,
    )
    created_by = models.ForeignKey(
        "core.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="expenses",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def clean(self):
        if self.expense_account and self.expense_account.company_id != self.company_id:
            raise ValidationError("Expense account must belong to the same company.")

    def __str__(self):
        return f"{self.company.name} - Expense {self.id}"


class ExpenseAttachment(models.Model):
    expense = models.ForeignKey(
        "accounting.Expense",
        on_delete=models.CASCADE,
        related_name="attachments",
    )
    file = models.FileField(upload_to="expense_attachments/")
    uploaded_by = models.ForeignKey(
        "core.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="expense_attachments",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"ExpenseAttachment {self.id}"


class CatalogItem(models.Model):
    class ItemType(models.TextChoices):
        PRODUCT = "product", "Product"
        SERVICE = "service", "Service"

    company = models.ForeignKey(
        "core.Company",
        on_delete=models.CASCADE,
        related_name="catalog_items",
    )
    item_type = models.CharField(max_length=16, choices=ItemType.choices)
    name = models.CharField(max_length=255)
    barcode = models.CharField(max_length=64)
    stock_quantity = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    cost_price = models.DecimalField(max_digits=14, decimal_places=2)
    sale_price = models.DecimalField(max_digits=14, decimal_places=2)
    is_active = models.BooleanField(default=True)
    created_by = models.ForeignKey(
        "core.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="catalog_items",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["company", "barcode"],
                name="unique_catalog_item_barcode_per_company",
            ),
        ]

    def clean(self):
        if self.item_type == self.ItemType.SERVICE:
            self.stock_quantity = 0

    def __str__(self):
        return f"{self.name} ({self.item_type})"


class StockTransaction(models.Model):
    class TransactionType(models.TextChoices):
        STOCK_IN = "stock_in", "Stock In"
        STOCK_OUT = "stock_out", "Stock Out"
        ADJUSTMENT = "adjustment", "Adjustment"
        SALE = "sale", "Sale"
        UPDATE = "update", "Update"
        DELETE = "delete", "Delete"

    company = models.ForeignKey(
        "core.Company",
        on_delete=models.CASCADE,
        related_name="stock_transactions",
    )
    item = models.ForeignKey(
        "accounting.CatalogItem",
        on_delete=models.CASCADE,
        related_name="stock_transactions",
    )
    transaction_type = models.CharField(max_length=16, choices=TransactionType.choices)
    quantity_delta = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    unit_cost = models.DecimalField(max_digits=14, decimal_places=2)
    unit_price = models.DecimalField(max_digits=14, decimal_places=2)
    memo = models.TextField(blank=True)
    invoice = models.ForeignKey(
        "accounting.Invoice",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="stock_transactions",
    )
    created_by = models.ForeignKey(
        "core.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="stock_transactions",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.item_id} - {self.transaction_type}"