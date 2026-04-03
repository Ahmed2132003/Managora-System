from datetime import timedelta
import logging
from io import BytesIO

from django.db.models import Q
from django.http import Http404
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.conf import settings
from django.utils.dateparse import parse_date
from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import filters, mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.generics import (
    CreateAPIView,
    DestroyAPIView,
    ListAPIView,
    ListCreateAPIView,
    ListCreateAPIView,
)
from rest_framework.permissions import IsAuthenticated
from rest_framework.renderers import BaseRenderer
from rest_framework.response import Response
from rest_framework.views import APIView

from core.api_views.base import ThrottledAPIView, ThrottledListCreateAPIView
from core.models import User
from core.permissions import (
    HasAnyPermission,
    PermissionByActionMixin,
    user_has_permission,
)
from core.throttles import (
    AttendanceReadWriteThrottle,
    AttendanceThrottle,
    PayslipReadWriteThrottle,
    UploadThrottle,
)
from core.viewsets import CompanyScopedViewSet
from hr.models import (
    AttendanceRecord,
    Department,
    Employee,
    EmployeeDocument,
    HRAction,
    JobTitle,
    LoanAdvance,
    LeaveBalance,
    LeaveRequest,
    LeaveType,
    CommissionRequest,
    PayrollPeriod,
    PayrollRun,
    PayrollTaskRun,    
    SalaryComponent,
    PolicyRule,
    SalaryStructure,
    Shift,
    WorkSite,
)
from hr.attendance.services import (    
    check_in,
    check_out,
    request_self_attendance_otp,
    verify_self_attendance_otp,
    approve_attendance_action,
    reject_attendance_action,
)
from hr.employees.services import list_departments, list_job_titles
from hr.services.defaults import ensure_default_shifts, get_company_manager, get_default_shift
from hr.serializers import (
    DepartmentSerializer,
    AttendanceActionSerializer,
    AttendanceQrGenerateSerializer,
    AttendanceQrTokenSerializer,
    AttendanceRecordSerializer,
    AttendanceSelfRequestOtpSerializer,
    AttendanceSelfVerifyOtpSerializer,
    AttendanceApproveRejectSerializer,
    AttendancePendingItemSerializer,
    AttendanceEmailConfigUpsertSerializer,
    EmployeeCreateUpdateSerializer,
    EmployeeDetailSerializer,
    EmployeeSerializer,
    EmployeeDefaultsSerializer,
    EmployeeDocumentCreateSerializer,
    EmployeeDocumentSerializer,
    JobTitleSerializer,
    HRActionManageSerializer,
    HRActionSerializer,
    LeaveBalanceSerializer,
    LeaveDecisionSerializer,
    LeaveRequestCreateSerializer,
    LeaveRequestSerializer,
    LeaveTypeSerializer,
    CommissionRequestSerializer,
    CommissionRequestCreateSerializer,
    CommissionDecisionSerializer,
    PolicyRuleSerializer,
    PayrollPeriodSerializer,
    PayrollRunDetailSerializer,
    PayrollRunListSerializer,
    SalaryComponentSerializer,
    SalaryStructureSerializer,
    ShiftSerializer,
    WorkSiteSerializer,
    UserMiniSerializer,
    LoanAdvanceSerializer,
)
from hr.payroll.tasks import generate_payroll_period
from hr.leaves.services import (
    approve_leave,
    cancel_leave,
    list_leave_types,
    reject_leave,
    request_leave,
)    
from hr.services.lock import lock_period
from hr.services.payslip import render_payslip_pdf
import re

logger = logging.getLogger(__name__)



@extend_schema_view(
    list=extend_schema(tags=["Departments"], summary="List departments"),
    retrieve=extend_schema(tags=["Departments"], summary="Retrieve department"),
    create=extend_schema(tags=["Departments"], summary="Create department"),
    partial_update=extend_schema(tags=["Departments"], summary="Update department"),
    destroy=extend_schema(tags=["Departments"], summary="Delete department"),
)
class DepartmentViewSet(PermissionByActionMixin, CompanyScopedViewSet):    
    serializer_class = DepartmentSerializer
    permission_classes = [IsAuthenticated]
    permission_map = {
        "list": "hr.departments.view",
        "retrieve": "hr.departments.view",
        "create": "hr.departments.create",
        "partial_update": "hr.departments.edit",
        "destroy": "hr.departments.delete",
    }

    queryset = Department.objects.all()

    def list(self, request, *args, **kwargs):
        payload = list_departments(request.user.company_id)
        page = self.paginate_queryset(payload)
        if page is not None:
            return self.get_paginated_response(page)
        return Response(payload)
    
@extend_schema_view(
    list=extend_schema(tags=["Job Titles"], summary="List job titles"),
    retrieve=extend_schema(tags=["Job Titles"], summary="Retrieve job title"),
    create=extend_schema(tags=["Job Titles"], summary="Create job title"),
    partial_update=extend_schema(tags=["Job Titles"], summary="Update job title"),
    destroy=extend_schema(tags=["Job Titles"], summary="Delete job title"),
)

class JobTitleViewSet(PermissionByActionMixin, CompanyScopedViewSet):    
    serializer_class = JobTitleSerializer
    permission_classes = [IsAuthenticated]
    permission_map = {
        "list": "hr.job_titles.view",
        "retrieve": "hr.job_titles.view",
        "create": "hr.job_titles.create",
        "partial_update": "hr.job_titles.edit",
        "destroy": "hr.job_titles.delete",
    }

    queryset = JobTitle.objects.all()
    
    def list(self, request, *args, **kwargs):
        payload = list_job_titles(request.user.company_id)
        page = self.paginate_queryset(payload)
        if page is not None:
            return self.get_paginated_response(page)
        return Response(payload)
        




def _is_manager_or_hr(user):
    if not user or not user.is_authenticated:
        return False
    if user.is_superuser:
        return True

    roles_qs = user.roles.all()
    return roles_qs.filter(name__iexact="manager").exists() or roles_qs.filter(name__iexact="hr").exists()


@extend_schema_view(
    list=extend_schema(tags=["Shifts"], summary="List shifts"),
    retrieve=extend_schema(tags=["Shifts"], summary="Retrieve shift"),
    create=extend_schema(tags=["Shifts"], summary="Create shift"),
    partial_update=extend_schema(tags=["Shifts"], summary="Update shift"),
    destroy=extend_schema(tags=["Shifts"], summary="Delete shift"),
)
class ShiftViewSet(PermissionByActionMixin, CompanyScopedViewSet):    
    serializer_class = ShiftSerializer
    permission_classes = [IsAuthenticated]
    permission_map = {
        "list": "hr.shifts.view",
        "retrieve": "hr.shifts.view",
        "create": "hr.shifts.create",
        "partial_update": "hr.shifts.edit",
        "destroy": "hr.shifts.delete",
    }

    queryset = Shift.objects.all()
    
    def perform_create(self, serializer):
        if not _is_manager_or_hr(self.request.user):
            raise PermissionDenied("Only manager or HR can manage shifts.")
        serializer.save(company=self.request.user.company)

    def perform_update(self, serializer):
        if not _is_manager_or_hr(self.request.user):
            raise PermissionDenied("Only manager or HR can manage shifts.")
        serializer.save()

    def perform_destroy(self, instance):
        if not _is_manager_or_hr(self.request.user):
            raise PermissionDenied("Only manager or HR can manage shifts.")
        instance.delete()


@extend_schema_view(
    list=extend_schema(tags=["Worksites"], summary="List worksites"),
    retrieve=extend_schema(tags=["Worksites"], summary="Retrieve worksite"),
    create=extend_schema(tags=["Worksites"], summary="Create worksite"),
    partial_update=extend_schema(tags=["Worksites"], summary="Update worksite"),
    destroy=extend_schema(tags=["Worksites"], summary="Delete worksite"),
)
class WorkSiteViewSet(PermissionByActionMixin, CompanyScopedViewSet):    
    serializer_class = WorkSiteSerializer
    permission_classes = [IsAuthenticated]
    permission_map = {
        "list": "hr.worksites.view",
        "retrieve": "hr.worksites.view",
        "create": "hr.worksites.create",
        "partial_update": "hr.worksites.edit",
        "destroy": "hr.worksites.delete",
    }

    queryset = WorkSite.objects.all()
    
    def perform_create(self, serializer):
        if not _is_manager_or_hr(self.request.user):
            raise PermissionDenied("Only manager or HR can manage worksites.")
        serializer.save(company=self.request.user.company)

    def perform_update(self, serializer):
        if not _is_manager_or_hr(self.request.user):
            raise PermissionDenied("Only manager or HR can manage worksites.")
        serializer.save()

    def perform_destroy(self, instance):
        if not _is_manager_or_hr(self.request.user):
            raise PermissionDenied("Only manager or HR can manage worksites.")
        instance.delete()


@extend_schema_view(
    list=extend_schema(tags=["Employees"], summary="List employees"),
    retrieve=extend_schema(tags=["Employees"], summary="Retrieve employee"),
    create=extend_schema(tags=["Employees"], summary="Create employee"),
    partial_update=extend_schema(tags=["Employees"], summary="Update employee"),
    destroy=extend_schema(tags=["Employees"], summary="Delete employee"),
)
class EmployeeViewSet(PermissionByActionMixin, CompanyScopedViewSet):    
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["full_name", "employee_code", "national_id"]
    ordering_fields = ["full_name", "hire_date", "employee_code"]
    permission_map = {
        "list": "hr.employees.view",
        "retrieve": "hr.employees.view",
        "create": "hr.employees.create",
        "partial_update": "hr.employees.edit",
        "destroy": "hr.employees.delete",
    }

    def get_queryset(self):
        queryset = super().get_queryset().select_related("department", "job_title", "manager")
        
        status_filter = self.request.query_params.get("status")
        department = self.request.query_params.get("department")
        job_title = self.request.query_params.get("job_title")

        if status_filter:
            queryset = queryset.filter(status=status_filter)
        if department:
            queryset = queryset.filter(department_id=department)
        if job_title:
            queryset = queryset.filter(job_title_id=job_title)

        return queryset.order_by("id")

    queryset = Employee.objects.all()
    
    def get_serializer_class(self):
        if self.action in {"create", "partial_update"}:
            return EmployeeCreateUpdateSerializer
        if self.action == "retrieve":
            return EmployeeDetailSerializer
        return EmployeeSerializer


@extend_schema_view(
    list=extend_schema(tags=["Payroll"], summary="List salary structures"),
    retrieve=extend_schema(tags=["Payroll"], summary="Retrieve salary structure"),
    create=extend_schema(tags=["Payroll"], summary="Create salary structure"),
    partial_update=extend_schema(tags=["Payroll"], summary="Update salary structure"),
    destroy=extend_schema(tags=["Payroll"], summary="Delete salary structure"),
)
class SalaryStructureViewSet(PermissionByActionMixin, CompanyScopedViewSet):    
    serializer_class = SalaryStructureSerializer
    permission_classes = [IsAuthenticated]
    permission_map = {
        "list": "hr.payroll.view",
        "retrieve": "hr.payroll.view",
        "create": "hr.payroll.create",
        "partial_update": "hr.payroll.create",
        "destroy": "hr.payroll.create",
    }

    def get_queryset(self):
        queryset = super().get_queryset().select_related("employee")        
        employee_id = self.request.query_params.get("employee")
        if employee_id:
            queryset = queryset.filter(employee_id=employee_id)
        return queryset.order_by("id")

    queryset = SalaryStructure.objects.all()
    
@extend_schema_view(
    list=extend_schema(tags=["Payroll"], summary="List salary components"),
    retrieve=extend_schema(tags=["Payroll"], summary="Retrieve salary component"),
    create=extend_schema(tags=["Payroll"], summary="Create salary component"),
    partial_update=extend_schema(tags=["Payroll"], summary="Update salary component"),
    destroy=extend_schema(tags=["Payroll"], summary="Delete salary component"),
)

class SalaryComponentViewSet(PermissionByActionMixin, CompanyScopedViewSet):    
    serializer_class = SalaryComponentSerializer
    permission_classes = [IsAuthenticated]
    permission_map = {
        "list": "hr.payroll.view",
        "retrieve": "hr.payroll.view",
        "create": "hr.payroll.create",
        "partial_update": "hr.payroll.create",
        "destroy": "hr.payroll.create",
    }

    def get_queryset(self):
        queryset = SalaryComponent.objects.select_related(
            "salary_structure", "salary_structure__employee"
        ).filter(company=self._current_company())        
        salary_structure_id = self.request.query_params.get("salary_structure")
        employee_id = self.request.query_params.get("employee")
        if salary_structure_id:
            queryset = queryset.filter(salary_structure_id=salary_structure_id)
        if employee_id:
            queryset = queryset.filter(salary_structure__employee_id=employee_id)
        queryset = _restrict_adjustment_queryset(
            self.request.user, queryset, "salary_structure__employee"
        )
        return queryset.order_by("id")

    queryset = SalaryComponent.objects.all()
    
    def perform_create(self, serializer):
        salary_structure = serializer.validated_data.get("salary_structure")
        if salary_structure:
            _ensure_adjustment_access(self.request.user, salary_structure.employee)
        serializer.save()

    def perform_update(self, serializer):
        instance = serializer.instance
        if instance and instance.salary_structure_id:
            _ensure_adjustment_access(
                self.request.user, instance.salary_structure.employee
            )
        serializer.save()


@extend_schema_view(
    list=extend_schema(tags=["Payroll"], summary="List loan advances"),
    retrieve=extend_schema(tags=["Payroll"], summary="Retrieve loan advance"),
    create=extend_schema(tags=["Payroll"], summary="Create loan advance"),
    partial_update=extend_schema(tags=["Payroll"], summary="Update loan advance"),
    destroy=extend_schema(tags=["Payroll"], summary="Delete loan advance"),
)
class LoanAdvanceViewSet(PermissionByActionMixin, CompanyScopedViewSet):    
    serializer_class = LoanAdvanceSerializer
    permission_classes = [IsAuthenticated]
    permission_map = {
        "list": "hr.payroll.view",
        "retrieve": "hr.payroll.view",
        "create": "hr.payroll.create",
        "partial_update": "hr.payroll.create",
        "destroy": "hr.payroll.create",
    }

    def get_queryset(self):
        queryset = super().get_queryset().select_related("employee")
                
        employee_id = self.request.query_params.get("employee")
        status_filter = self.request.query_params.get("status")
        date_from = _parse_date_param(
            self.request.query_params.get("date_from"), "date_from"
        )
        date_to = _parse_date_param(
            self.request.query_params.get("date_to"), "date_to"
        )
        if employee_id:
            queryset = queryset.filter(employee_id=employee_id)
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        if date_from:
            queryset = queryset.filter(start_date__gte=date_from)
        if date_to:
            queryset = queryset.filter(start_date__lte=date_to)
        queryset = _restrict_adjustment_queryset(
            self.request.user, queryset, "employee"
        )        
        return queryset.order_by("id")
    queryset = LoanAdvance.objects.all()

    def perform_create(self, serializer):
        employee = serializer.validated_data.get("employee")
        if employee:
            _ensure_adjustment_access(self.request.user, employee)
        serializer.save()

    def perform_update(self, serializer):
        instance = serializer.instance
        if instance:
            _ensure_adjustment_access(self.request.user, instance.employee)
        serializer.save()


@extend_schema(tags=["Employees"], summary="Selectable users for employee linking")
class EmployeeSelectableUsersView(ListAPIView):
    serializer_class = UserMiniSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        permissions = [permission() for permission in self.permission_classes]
        permissions.append(HasAnyPermission(["hr.employees.create", "hr.employees.edit"]))
        return permissions

    def get_queryset(self):
        """
        Return ONLY users in the same company that are NOT already linked
        to an active (not deleted) employee profile.
        """
        company = getattr(self.request.user, "company", None)
        if not company:
            return User.objects.none()

        return (
            User.objects.filter(company=company, is_active=True)
            .filter(Q(employee_profile__isnull=True) | Q(employee_profile__is_deleted=True))
            .distinct()
            .order_by("id")
        )


@extend_schema(tags=["Employees"], summary="Default employee form values")
class EmployeeDefaultsView(APIView):
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        permissions = [permission() for permission in self.permission_classes]
        permissions.append(HasAnyPermission(["hr.employees.create", "hr.employees.edit"]))
        return permissions

    def get(self, request):
        company = request.user.company
        ensure_default_shifts(company)
        payload = {
            "manager": get_company_manager(company),
            "shift": get_default_shift(company),
        }
        return Response(EmployeeDefaultsSerializer(payload).data)


@extend_schema(
    tags=["Employee Documents"],
    summary="List or create employee documents",
)

class EmployeeDocumentListCreateView(ThrottledListCreateAPIView):    
    permission_classes = [IsAuthenticated]
    throttle_classes = [UploadThrottle]      
      
    def get_employee(self):
        employee = get_object_or_404(Employee.all_objects, pk=self.kwargs["employee_id"])
        if employee.company_id != self.request.user.company_id:
            raise Http404
        return employee

    def get_queryset(self):
        employee = self.get_employee()
        queryset = EmployeeDocument.objects.filter(            
            company=self.request.user.company, employee=employee
        )
        category = self.request.query_params.get("category")
        search = (self.request.query_params.get("q") or "").strip()
        if category:
            queryset = queryset.filter(category=category)
        if search:
            queryset = queryset.filter(
                Q(title__icontains=search)
                | Q(ocr_text__icontains=search)
                | Q(linked_entity_id__icontains=search)
            )
        return queryset.order_by("id")
    
    def get_serializer_class(self):
        if self.request.method == "POST":
            return EmployeeDocumentCreateSerializer
        return EmployeeDocumentSerializer

    def get_permissions(self):
        permissions = [permission() for permission in self.permission_classes]
        if self.request.method == "POST":
            permissions.append(
                HasAnyPermission(["hr.employees.edit", "hr.documents.create"])
            )
        else:
            permissions.append(
                HasAnyPermission(["hr.employees.view", "hr.documents.view"])
            )
        return permissions

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["employee"] = self.get_employee()
        return context

    def create(self, request, *args, **kwargs):
        
        return super().create(request, *args, **kwargs)

@extend_schema(
    tags=["Employee Documents"],
    summary="List or create my employee documents",
)
class MyEmployeeDocumentListCreateView(ThrottledListCreateAPIView):    
    permission_classes = [IsAuthenticated]
    throttle_classes = [UploadThrottle]
            
    def get_employee(self):
        employee = getattr(self.request.user, "employee_profile", None)
        if not employee or employee.company_id != self.request.user.company_id:
            raise PermissionDenied("Employee profile is required.")
        if employee.is_deleted:
            raise PermissionDenied("Deleted employee profiles cannot upload documents.")
        return employee

    def get_queryset(self):
        employee = self.get_employee()
        queryset = EmployeeDocument.objects.filter(            
            company=self.request.user.company, employee=employee
        )
        category = self.request.query_params.get("category")
        search = (self.request.query_params.get("q") or "").strip()
        if category:
            queryset = queryset.filter(category=category)
        if search:
            queryset = queryset.filter(
                Q(title__icontains=search)
                | Q(ocr_text__icontains=search)
                | Q(linked_entity_id__icontains=search)
            )
        return queryset.order_by("id")
    
    def get_serializer_class(self):
        if self.request.method == "POST":
            return EmployeeDocumentCreateSerializer
        return EmployeeDocumentSerializer

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["employee"] = self.get_employee()
        return context

    def create(self, request, *args, **kwargs):
        
        return super().create(request, *args, **kwargs)


@extend_schema(
    tags=["Employee Documents"],
    summary="Download employee document",
)
class EmployeeDocumentDownloadView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk=None):
        document = get_object_or_404(EmployeeDocument.all_objects, pk=pk)
        if document.company_id != request.user.company_id:
            raise Http404
        if document.is_deleted:
            raise Http404
        employee = getattr(request.user, "employee_profile", None)
        has_document_access = user_has_permission(request.user, "hr.employees.view") or user_has_permission(
            request.user, "hr.documents.view"
        )
        is_owner = employee and employee.id == document.employee_id
        if not has_document_access and not is_owner:
            raise PermissionDenied("You do not have permission to download this document.")
        storage = document.file.storage
        expiry = getattr(settings, "AWS_QUERYSTRING_EXPIRE", 300)
        try:
            signed_url = storage.url(document.file.name, expire=expiry)
        except TypeError:
            signed_url = storage.url(document.file.name)
        return Response({"download_url": signed_url, "expires_in": expiry})
    

@extend_schema(
    tags=["Employee Documents"],
    summary="Delete employee document",
)
class EmployeeDocumentDeleteView(DestroyAPIView):
    permission_classes = [IsAuthenticated]


    def get_queryset(self):
        employee = getattr(self.request.user, "employee_profile", None)
        has_delete_access = user_has_permission(
            self.request.user, "hr.employees.edit"
        ) or user_has_permission(self.request.user, "hr.documents.delete")
        queryset = EmployeeDocument.objects.filter(company=self.request.user.company)
        if has_delete_access:
            return queryset
        if employee:
            return queryset.filter(employee=employee)
        return queryset.none()
    

def _parse_date_param(value, label):
    if not value:
        return None
    parsed = parse_date(value)
    if not parsed:
        raise ValidationError({label: "Invalid date format. Use YYYY-MM-DD."})
    return parsed


def _user_role_names(user) -> set[str]:
    if not user or not user.is_authenticated:
        return set()
    return {name.strip().lower() for name in user.roles.values_list("name", flat=True)}


def _format_user_name(user) -> str:
    if not user:
        return "-"
    first = (user.first_name or "").strip()
    last = (user.last_name or "").strip()
    full_name = f"{first} {last}".strip()
    return full_name or user.username or "-"


def _get_company_role_user(company, role_name: str):
    if not company:
        return None
    return (
        User.objects.filter(company=company, roles__name__iexact=role_name)
        .distinct()
        .first()
    )

def _ensure_adjustment_access(user, employee: Employee):
    roles = _user_role_names(user)
    if "admin" in roles or "manager" in roles:
        return
    if "hr" in roles:
        requester_user = getattr(employee, "user", None)
        requester_roles = _user_role_names(requester_user)
        if {"hr", "manager"} & set(requester_roles):
            raise PermissionDenied("HR can only manage employee or accountant adjustments.")
        return
    raise PermissionDenied("You do not have permission to manage payroll adjustments.")


def _restrict_adjustment_queryset(user, queryset, employee_field: str):
    roles = _user_role_names(user)
    if "admin" in roles or "manager" in roles:
        return queryset
    if "hr" in roles:
        return (
            queryset.exclude(**{f"{employee_field}__user__roles__name__iexact": "HR"})
            .exclude(**{f"{employee_field}__user__roles__name__iexact": "Manager"})
        )
    raise PermissionDenied("You do not have permission to view payroll adjustments.")


def _get_user_employee(user):
    employee = getattr(user, "employee_profile", None)
    if not employee or employee.is_deleted or employee.company_id != user.company_id:
        raise PermissionDenied("Employee profile is required.")
    return employee


def _user_can_approve_attendance(user, attendance_record: AttendanceRecord) -> bool:
    if user_has_permission(user, "attendance.*"):
        return True
    if user_has_permission(user, "approvals.*"):
        manager_employee = getattr(user, "employee_profile", None)
        if not manager_employee or manager_employee.is_deleted:
            return False
        return attendance_record.employee.manager_id == manager_employee.id
    return False


def _build_pending_attendance_items(record: AttendanceRecord) -> list[dict]:
    items = []
    if (
        record.check_in_time
        and record.check_in_approval_status == AttendanceRecord.ApprovalStatus.PENDING
    ):
        items.append(
            {
                "record_id": record.id,
                "employee_id": record.employee_id,
                "employee_name": record.employee.full_name,
                "date": record.date,
                "action": "checkin",
                "time": record.check_in_time,
                "lat": record.check_in_lat,
                "lng": record.check_in_lng,
                "distance_meters": record.check_in_distance_meters,
                "status": record.check_in_approval_status,
            }
        )
    if (
        record.check_out_time
        and record.check_out_approval_status == AttendanceRecord.ApprovalStatus.PENDING
    ):
        items.append(
            {
                "record_id": record.id,
                "employee_id": record.employee_id,
                "employee_name": record.employee.full_name,
                "date": record.date,
                "action": "checkout",
                "time": record.check_out_time,
                "lat": record.check_out_lat,
                "lng": record.check_out_lng,
                "distance_meters": record.check_out_distance_meters,
                "status": record.check_out_approval_status,
            }
        )
    return items

def _user_can_approve(user, leave_request):    
    # Permissions
    has_leaves = user_has_permission(user, "leaves.*")
    has_approvals = user_has_permission(user, "approvals.*")

    if not (has_leaves or has_approvals):
        logger.info("LEAVE_APPROVE_CHECK denied=no_permission user_id=%s", getattr(user, "id", None))
        return False

    # Can't approve own request
    if leave_request.employee.user_id == user.id:
        logger.info("LEAVE_APPROVE_CHECK denied=own_request user_id=%s leave_id=%s", user.id, leave_request.id)
        return False

    approver_roles = _user_role_names(user)
    requester_user = getattr(leave_request.employee, "user", None)
    requester_roles = _user_role_names(requester_user)

    logger.info(
        "LEAVE_APPROVE_CHECK user_id=%s has_leaves=%s has_approvals=%s approver_roles=%s requester_user_id=%s requester_roles=%s leave_id=%s",
        getattr(user, "id", None),
        has_leaves,
        has_approvals,
        sorted(list(approver_roles)),
        getattr(requester_user, "id", None),
        sorted(list(requester_roles)),
        getattr(leave_request, "id", None),
    )

    # Admin as super-approver (if role exists)
    if "admin" in approver_roles:
        return True

    # leaves.*: full controller, but apply HR restriction if HR-only (not manager)
    if has_leaves:
        if "hr" in approver_roles and "manager" not in approver_roles:
            if {"hr", "manager", "admin"} & set(requester_roles):
                return False
        return True

    # approvals.*: role-based approvals
    if "manager" in approver_roles:
        # manager can approve; if requester is manager too, optionally restrict by direct manager
        if "manager" in requester_roles:
            if leave_request.employee.manager_id:
                manager_employee = getattr(user, "employee_profile", None)
                return bool(
                    manager_employee and manager_employee.id == leave_request.employee.manager_id
                )
            return True
        return True

    if "hr" in approver_roles:
        # HR approves only Employee/Accountant
        if {"hr", "manager", "admin"} & set(requester_roles):
            return False
        return True

    return False


def _user_can_approve_commission(user, commission_request):
    if not (
        user_has_permission(user, "commissions.*")
        or user_has_permission(user, "approvals.*")
    ):
        return False
    if commission_request.employee.user_id == user.id:
        return False

    approver_roles = _user_role_names(user)
    requester_user = getattr(commission_request.employee, "user", None)
    requester_roles = _user_role_names(requester_user)

    if "manager" in approver_roles:
        return True

    if "hr" in approver_roles:
        if "hr" in requester_roles or "manager" in requester_roles:
                        
            return False
        return True
        
    return False


def _user_has_payroll_permission(user, codes):
    return any(user_has_permission(user, code) for code in codes)


class AttendanceCheckInView(ThrottledAPIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [AttendanceThrottle]
    
    @extend_schema(
        tags=["Attendance"],
        summary="Employee check-in",
        request=AttendanceActionSerializer,
        responses={201: AttendanceRecordSerializer},
    )
    def post(self, request):
        serializer = AttendanceActionSerializer(
            data=request.data, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        employee = self._resolve_employee(request, serializer.validated_data)
        record = check_in(request.user, employee.id, serializer.validated_data)
        return Response(
            AttendanceRecordSerializer(record).data,
            status=status.HTTP_201_CREATED,
        )

    def _resolve_employee(self, request, validated_data):
        employee = validated_data["employee"]
        linked_employee = getattr(request.user, "employee_profile", None)
        if linked_employee:
            if employee.id != linked_employee.id:
                raise PermissionDenied("You can only check in for yourself.")
            return employee
        if not user_has_permission(request.user, "attendance.*"):
            raise PermissionDenied("You do not have permission to check in for others.")
        if validated_data["method"] != AttendanceRecord.Method.MANUAL:
            raise PermissionDenied(
                "Only manual check-in is allowed when acting on behalf of others."
            )
        return employee


class AttendanceCheckOutView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=["Attendance"],
        summary="Employee check-out",
        request=AttendanceActionSerializer,
        responses={200: AttendanceRecordSerializer},
    )
    def post(self, request):
        serializer = AttendanceActionSerializer(
            data=request.data, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        employee = self._resolve_employee(request, serializer.validated_data)
        record = check_out(request.user, employee.id, serializer.validated_data)
        return Response(AttendanceRecordSerializer(record).data)

    def _resolve_employee(self, request, validated_data):
        employee = validated_data["employee"]
        linked_employee = getattr(request.user, "employee_profile", None)
        if linked_employee:
            if employee.id != linked_employee.id:
                raise PermissionDenied("You can only check out for yourself.")
            return employee
        if not user_has_permission(request.user, "attendance.*"):
            raise PermissionDenied("You do not have permission to check out for others.")
        if validated_data["method"] != AttendanceRecord.Method.MANUAL:
            raise PermissionDenied(
                "Only manual check-out is allowed when acting on behalf of others."
            )
        return employee


class AttendanceQrGenerateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        raise ValidationError("QR attendance is disabled.")


class AttendanceCompanyQrView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        raise ValidationError("QR attendance is disabled.")


class AttendanceMyView(ListAPIView):
    serializer_class = AttendanceRecordSerializer
    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=["Attendance"],
        summary="List my attendance records",
        responses={200: AttendanceRecordSerializer(many=True)},
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)

    def get_queryset(self):
        employee = getattr(self.request.user, "employee_profile", None)
        if not employee:
            return AttendanceRecord.objects.none()
        
        date_from = _parse_date_param(
            self.request.query_params.get("date_from"), "date_from"
        )
        date_to = _parse_date_param(
            self.request.query_params.get("date_to"), "date_to"
        )

        if not date_from and not date_to:
            date_to = timezone.localdate()
            date_from = date_to - timedelta(days=30)

        queryset = AttendanceRecord.objects.filter(
            company=self.request.user.company,
            employee=employee,
        )
        if date_from:
            queryset = queryset.filter(date__gte=date_from)
        if date_to:
            queryset = queryset.filter(date__lte=date_to)
        return queryset.order_by("-date", "-check_in_time")


# =========================
# Attendance (NEW EMAIL OTP FLOW)
# =========================


@extend_schema(
    tags=["Attendance"],
    summary="Request OTP for self-attendance",
    request=AttendanceSelfRequestOtpSerializer,
    responses={201: dict},
)
class AttendanceSelfRequestOtpView(APIView):
    """Send an OTP to the employee email for self attendance."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        employee = _get_user_employee(request.user)
        serializer = AttendanceSelfRequestOtpSerializer(
            data=request.data, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)

        # Service is responsible for creating/sending the OTP.
        payload = request_self_attendance_otp(
            request.user, serializer.validated_data.get("purpose")
        )
        return Response(payload, status=status.HTTP_201_CREATED)


@extend_schema(
    tags=["Attendance"],
    summary="Verify OTP and create attendance record",
    request=AttendanceSelfVerifyOtpSerializer,
    responses={201: AttendanceRecordSerializer},
)
class AttendanceSelfVerifyOtpView(APIView):
    """Verify an OTP and apply the attendance action (check-in/out)."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        employee = _get_user_employee(request.user)
        serializer = AttendanceSelfVerifyOtpSerializer(
            data=request.data, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)

        payload = serializer.validated_data
        record = verify_self_attendance_otp(
            request.user,
            request_id=payload["request_id"],
            code=payload["code"],
            lat=payload["lat"],
            lng=payload["lng"],
        )            
        return Response(
            AttendanceRecordSerializer(record).data,
            status=status.HTTP_201_CREATED,
        )


@extend_schema(
    tags=["Attendance"],
    summary="Get or update company email config for attendance OTP",
)
class AttendanceEmailConfigView(APIView):
    """Return OTP sender configuration.

    The system uses a single global sender (configured via env/settings) rather than per-company.
    We keep this endpoint for UI compatibility but it no longer stores secrets in the database.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        mode = (getattr(settings, "ATTENDANCE_OTP_MODE", "console") or "console").strip().lower()
        sender_email = getattr(settings, "ATTENDANCE_OTP_SENDER_EMAIL", "") or ""
        configured = bool(sender_email and getattr(settings, "ATTENDANCE_OTP_APP_PASSWORD", ""))
        return Response({"mode": mode, "configured": configured, "sender_email": sender_email, "is_active": True})

    def post(self, request):
        # Ignore body; configuration comes from settings.
        mode = (getattr(settings, "ATTENDANCE_OTP_MODE", "console") or "console").strip().lower()
        sender_email = getattr(settings, "ATTENDANCE_OTP_SENDER_EMAIL", "") or ""
        configured = bool(sender_email and getattr(settings, "ATTENDANCE_OTP_APP_PASSWORD", ""))
        return Response({"mode": mode, "configured": configured, "sender_email": sender_email, "is_active": True})    
@extend_schema(
    tags=["Attendance"],
    summary="List pending attendance items that require approval",
    responses={200: AttendancePendingItemSerializer(many=True)},
)
class AttendancePendingApprovalsView(ListAPIView):
    serializer_class = AttendancePendingItemSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        permissions = [permission() for permission in self.permission_classes]
        permissions.append(HasAnyPermission(["attendance.*", "approvals.*"]))
        return permissions

    def get_queryset(self):
        qs = AttendanceRecord.objects.select_related("employee").filter(
            company=self.request.user.company
        )
        user = self.request.user
        
        if user_has_permission(user, "attendance.*"):
            pass
        elif user_has_permission(user, "approvals.*"):
            manager_employee = getattr(user, "employee_profile", None)
            if not manager_employee or manager_employee.is_deleted:
                raise PermissionDenied("Manager profile is required.")
            qs = qs.filter(employee__manager=manager_employee)
                        
        else:
            raise PermissionDenied("You do not have permission to view approvals.")

        date_from = _parse_date_param(
            self.request.query_params.get("date_from"), "date_from"
        )
        date_to = _parse_date_param(
            self.request.query_params.get("date_to"), "date_to"
        )
        if date_from:
            qs = qs.filter(date__gte=date_from)
        if date_to:
            qs = qs.filter(date__lte=date_to)

        pending_status = AttendanceRecord.ApprovalStatus.PENDING
        qs = qs.filter(
            Q(check_in_approval_status=pending_status)
            | Q(check_out_approval_status=pending_status)
        )                
        return qs.order_by("-date", "-check_in_time")

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        items = []
        for record in queryset:
            items.extend(_build_pending_attendance_items(record))
        serializer = self.get_serializer(items, many=True)
        return Response(serializer.data)

@extend_schema(
    tags=["Attendance"],
    summary="Approve or reject a pending attendance item",
    request=AttendanceApproveRejectSerializer,
    responses={200: AttendanceRecordSerializer},
)
class AttendanceApproveRejectView(APIView):
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        permissions = [permission() for permission in self.permission_classes]
        permissions.append(HasAnyPermission(["attendance.*", "approvals.*"]))
        return permissions

    def post(self, request, record_id=None, action=None):
        serializer = AttendanceApproveRejectSerializer(
            data=request.data, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)

        record = get_object_or_404(
            AttendanceRecord, id=record_id, company=request.user.company
        )
        if not _user_can_approve_attendance(request.user, record):
            raise PermissionDenied("You do not have permission to approve this request.")
        
        action_value = (action or "").lower()
        if action_value not in {"approve", "reject"}:
            raise ValidationError({"action": "Invalid action. Use approve or reject."})

        if action_value == "approve":
            record = approve_attendance_action(
                approver=request.user,
                record=record,
                action=serializer.validated_data["action"],
            )
                        
        else:
            record = reject_attendance_action(
                approver=request.user,
                record=record,
                action=serializer.validated_data["action"],
                reason=serializer.validated_data.get("reason"),                
            )

        return Response(AttendanceRecordSerializer(record).data)


@extend_schema_view(
    list=extend_schema(tags=["Attendance"], summary="List attendance records"),
)
class AttendanceRecordViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = AttendanceRecordSerializer
    permission_classes = [IsAuthenticated]
    throttle_classes = [AttendanceReadWriteThrottle]
    
    def get_permissions(self):
        permissions = [permission() for permission in self.permission_classes]
        permissions.append(HasAnyPermission(["attendance.*"]))
        return permissions

    def get_queryset(self):
        queryset = AttendanceRecord.objects.select_related(
            "employee", "employee__department"
        ).filter(company=self.request.user.company)

        date_from = _parse_date_param(
            self.request.query_params.get("date_from"), "date_from"
        )
        date_to = _parse_date_param(
            self.request.query_params.get("date_to"), "date_to"
        )
        employee_id = self.request.query_params.get("employee_id")
        department_id = self.request.query_params.get("department_id")
        status_filter = self.request.query_params.get("status")
        search = self.request.query_params.get("search")

        if date_from:
            queryset = queryset.filter(date__gte=date_from)
        if date_to:
            queryset = queryset.filter(date__lte=date_to)
        if employee_id:
            queryset = queryset.filter(employee_id=employee_id)
        if department_id:
            queryset = queryset.filter(employee__department_id=department_id)
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        if search:
            queryset = queryset.filter(
                Q(employee__full_name__icontains=search)
                | Q(employee__employee_code__icontains=search)
            )

        return queryset.order_by("-date", "-check_in_time")


@extend_schema_view(
    list=extend_schema(tags=["Policies"], summary="List policy rules"),
    retrieve=extend_schema(tags=["Policies"], summary="Retrieve policy rule"),
    create=extend_schema(tags=["Policies"], summary="Create policy rule"),
    partial_update=extend_schema(tags=["Policies"], summary="Update policy rule"),
    destroy=extend_schema(tags=["Policies"], summary="Delete policy rule"),
)
class PolicyRuleViewSet(viewsets.ModelViewSet):
    serializer_class = PolicyRuleSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        permissions = [permission() for permission in self.permission_classes]
        permissions.append(HasAnyPermission(["attendance.*"]))
        return permissions

    def get_queryset(self):
        return PolicyRule.objects.filter(company=self.request.user.company).order_by(
            "-created_at"
        )

    def perform_create(self, serializer):
        serializer.save(company=self.request.user.company)

    def perform_update(self, serializer):
        serializer.save(company=self.request.user.company)


@extend_schema_view(
    list=extend_schema(tags=["Policies"], summary="List HR actions"),
    retrieve=extend_schema(tags=["Policies"], summary="Retrieve HR action"),
)
class HRActionViewSet(
    mixins.UpdateModelMixin,
    mixins.DestroyModelMixin,
    viewsets.ReadOnlyModelViewSet,
):    
    serializer_class = HRActionSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        permissions = [permission() for permission in self.permission_classes]
        permissions.append(HasAnyPermission(["attendance.*"]))
        return permissions

    def get_serializer_class(self):
        if self.action in {"update", "partial_update"}:
            return HRActionManageSerializer
        return HRActionSerializer

    def get_queryset(self):
        queryset = HRAction.objects.select_related("employee", "rule").filter(
            company=self.request.user.company
        )
        employee_id = self.request.query_params.get("employee_id")
        if employee_id:
            queryset = queryset.filter(employee_id=employee_id)
        return queryset.order_by("-created_at")



@extend_schema_view(
    list=extend_schema(tags=["Leaves"], summary="List leave types"),
    retrieve=extend_schema(tags=["Leaves"], summary="Retrieve leave type"),
    create=extend_schema(tags=["Leaves"], summary="Create leave type"),
    partial_update=extend_schema(tags=["Leaves"], summary="Update leave type"),
    destroy=extend_schema(tags=["Leaves"], summary="Delete leave type"),
)
class LeaveTypeViewSet(CompanyScopedViewSet):    
    serializer_class = LeaveTypeSerializer
    permission_classes = [IsAuthenticated]
    queryset = LeaveType.objects.all()
    
    def get_permissions(self):
        permissions = [permission() for permission in self.permission_classes]
        if self.action in {"create", "partial_update", "destroy"}:
            permissions.append(HasAnyPermission(["leaves.*"]))
        return permissions

    def get_queryset(self):
        queryset = super().get_queryset()
        company_id = getattr(self.request.user, "company_id", None)
        if company_id is None:
            logger.error(
                "LEAVE_TYPES_DEBUG missing_company user_id=%s is_auth=%s",
                getattr(self.request.user, "id", None),
                getattr(self.request.user, "is_authenticated", False),
            )
            raise ValidationError({"detail": "Authenticated user must belong to a company."})

        if not user_has_permission(self.request.user, "leaves.*"):
            queryset = queryset.filter(is_active=True)
        logger.warning(
            "LEAVE_TYPES_DEBUG %s",
            {
                "user_id": getattr(self.request.user, "id", None),
                "is_auth": bool(getattr(self.request.user, "is_authenticated", False)),
                "company_id": company_id,
                "count": queryset.count(),
            },
        )
        return queryset    

    def list(self, request, *args, **kwargs):
        include_inactive = user_has_permission(request.user, "leaves.*")
        payload = list_leave_types(
            request.user.company_id,
            include_inactive=include_inactive,
        )
        page = self.paginate_queryset(payload)
        if page is not None:
            return self.get_paginated_response(page)
        return Response(payload)
    

@extend_schema_view(
    list=extend_schema(tags=["Leaves"], summary="List leave balances"),
    create=extend_schema(tags=["Leaves"], summary="Create leave balance"),
    partial_update=extend_schema(tags=["Leaves"], summary="Update leave balance"),
)
class LeaveBalanceViewSet(CompanyScopedViewSet):    
    serializer_class = LeaveBalanceSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "post", "patch", "head", "options"]

    def get_permissions(self):
        permissions = [permission() for permission in self.permission_classes]
        permissions.append(HasAnyPermission(["leaves.*"]))
        return permissions

    def get_queryset(self):
        return super().get_queryset().select_related("employee", "leave_type").order_by(
            "-year", "employee__id"            
        )

    def get_serializer_context(self):
        context = super().get_serializer_context()
        if self.action == "create":
            context["allow_upsert"] = True
        return context

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        employee = serializer.validated_data["employee"]
        leave_type = serializer.validated_data["leave_type"]
        year = serializer.validated_data["year"]
        existing_balance = LeaveBalance.objects.filter(
            company=request.user.company,
            employee=employee,
            leave_type=leave_type,
            year=year,
        ).first()

        if existing_balance:
            update_serializer = self.get_serializer(
                existing_balance, data=request.data, partial=True
            )
            update_serializer.is_valid(raise_exception=True)
            self.perform_update(update_serializer)
            return Response(update_serializer.data, status=status.HTTP_200_OK)

        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    queryset = LeaveBalance.objects.all()

@extend_schema(
    tags=["Leaves"],
    summary="List my leave balances",
)
class LeaveBalanceMyView(ListAPIView):
    serializer_class = LeaveBalanceSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        employee = _get_user_employee(self.request.user)
        queryset = LeaveBalance.objects.select_related("leave_type").filter(
            company=self.request.user.company, employee=employee
        )
        year = self.request.query_params.get("year")
        if year:
            queryset = queryset.filter(year=year)
        return queryset.order_by("-year", "leave_type__name")


@extend_schema(
    tags=["Leaves"],
    summary="Create leave request",
    request=LeaveRequestCreateSerializer,
    responses={201: LeaveRequestSerializer},
)
class LeaveRequestCreateView(CreateAPIView):
    serializer_class = LeaveRequestCreateSerializer
    permission_classes = [IsAuthenticated]

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["employee"] = _get_user_employee(self.request.user)
        return context

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if not serializer.is_valid():
            logger.warning(
                "Leave request validation failed before service call",
                extra={
                    "user_id": request.user.id,
                    "company_id": request.user.company_id,
                    "payload": dict(request.data),
                    "errors": serializer.errors,
                },
            )
            raise ValidationError(serializer.errors)
        try:
            leave_request = request_leave(
                employee=serializer.validated_data["employee"],
                leave_type=serializer.validated_data["leave_type"],
                start_date=serializer.validated_data["start_date"],
                end_date=serializer.validated_data["end_date"],
                reason=serializer.validated_data.get("reason"),
            )
        except ValidationError as exc:
            logger.warning(
                "Leave request service validation failed",
                extra={
                    "user_id": request.user.id,
                    "company_id": request.user.company_id,
                    "payload": dict(request.data),
                    "detail": exc.detail,
                },
            )
            raise
        return Response(
            LeaveRequestSerializer(leave_request).data, status=status.HTTP_201_CREATED
        )
        

@extend_schema(
    tags=["Leaves"],
    summary="List my leave requests",
)
class LeaveRequestMyListView(ListAPIView):
    serializer_class = LeaveRequestSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        employee = _get_user_employee(self.request.user)
        queryset = LeaveRequest.objects.select_related("employee", "leave_type").filter(
            company=self.request.user.company, employee=employee
        )

        status_filter = self.request.query_params.get("status")
        if status_filter:
            status_value = status_filter.lower()
            if status_value not in LeaveRequest.Status.values:
                raise ValidationError({"status": "Invalid status value."})
            queryset = queryset.filter(status=status_value)

        date_from = _parse_date_param(
            self.request.query_params.get("date_from"), "date_from"
        )
        date_to = _parse_date_param(
            self.request.query_params.get("date_to"), "date_to"
        )
        leave_type_id = self.request.query_params.get("leave_type")

        if date_from:
            queryset = queryset.filter(start_date__gte=date_from)
        if date_to:
            queryset = queryset.filter(end_date__lte=date_to)
        if leave_type_id:
            queryset = queryset.filter(leave_type_id=leave_type_id)

        return queryset.order_by("-requested_at")


@extend_schema(
    tags=["Leaves"],
    summary="Cancel leave request",
    responses={200: LeaveRequestSerializer},
)
class LeaveRequestCancelView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, id=None):
        employee = _get_user_employee(request.user)
        leave_request = get_object_or_404(
            LeaveRequest, id=id, company=request.user.company, employee=employee
        )
        leave_request = cancel_leave(leave_request)        
        leave_request.decided_by = request.user
        leave_request.decided_at = timezone.now()
        leave_request.save(update_fields=["decided_by", "decided_at", "updated_at"])        
        return Response(LeaveRequestSerializer(leave_request).data)


@extend_schema(
    tags=["Leaves"],
    summary="Approvals inbox",
)
class LeaveApprovalsInboxView(ListAPIView):
    serializer_class = LeaveRequestSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        roles = _user_role_names(user)
        queryset = LeaveRequest.objects.select_related("employee", "leave_type").filter(
            company=user.company
        )
        queryset = queryset.exclude(employee__user=user)
        
        
        if user_has_permission(user, "leaves.*"):
            if "hr" in roles and "manager" not in roles:
                queryset = queryset.exclude(
                    employee__user__roles__name__iexact="HR"
                ).exclude(employee__user__roles__name__iexact="Manager")        
        elif user_has_permission(user, "approvals.*"):
            manager_employee = getattr(user, "employee_profile", None)
            if not manager_employee or manager_employee.is_deleted:
                raise PermissionDenied("Manager profile is required.")
            queryset = queryset.filter(employee__manager=manager_employee)
        else:
            raise PermissionDenied("You do not have permission to view approvals.")

        status_filter = self.request.query_params.get("status") or LeaveRequest.Status.PENDING
        if status_filter:
            status_value = status_filter.lower()
            if status_value not in LeaveRequest.Status.values:
                raise ValidationError({"status": "Invalid status value."})
            queryset = queryset.filter(status=status_value)

        employee_search = self.request.query_params.get("employee")
        if employee_search:
            queryset = queryset.filter(
                Q(employee__full_name__icontains=employee_search)
                | Q(employee__employee_code__icontains=employee_search)
            )

        return queryset.order_by("-requested_at")


@extend_schema(
    tags=["Leaves"],
    summary="Approve leave request",
    responses={200: LeaveRequestSerializer},
)
class LeaveApproveView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, id=None):
        leave_request = get_object_or_404(
            LeaveRequest, id=id, company=request.user.company
        )
        if not _user_can_approve(request.user, leave_request):
            raise PermissionDenied("You do not have permission to approve this request.")

        leave_request = approve_leave(leave_request=leave_request, approved_by=request.user)        
        return Response(LeaveRequestSerializer(leave_request).data)


@extend_schema(
    tags=["Leaves"],
    summary="Reject leave request",
    request=LeaveDecisionSerializer,
    responses={200: LeaveRequestSerializer},
)
class LeaveRejectView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, id=None):
        leave_request = get_object_or_404(
            LeaveRequest, id=id, company=request.user.company
        )
        if not _user_can_approve(request.user, leave_request):
            raise PermissionDenied("You do not have permission to reject this request.")

        serializer = LeaveDecisionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        leave_request = reject_leave(
            leave_request=leave_request,
            rejected_by=request.user,
            reason=serializer.validated_data.get("reason"),            
        )
        return Response(LeaveRequestSerializer(leave_request).data)


@extend_schema(
    tags=["Commissions"],
    summary="Create commission request",
    request=CommissionRequestCreateSerializer,
    responses={201: CommissionRequestSerializer},
)
class CommissionRequestCreateView(CreateAPIView):
    serializer_class = CommissionRequestCreateSerializer
    permission_classes = [IsAuthenticated]

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["employee"] = _get_user_employee(self.request.user)
        return context

    def create(self, request, *args, **kwargs):
        roles = _user_role_names(request.user)
        if "employee" not in roles and "accountant" not in roles:
            raise PermissionDenied("Only employees or accountants can request commissions.")
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        commission_request = serializer.save()
        return Response(
            CommissionRequestSerializer(commission_request).data,
            status=status.HTTP_201_CREATED,
        )


@extend_schema(
    tags=["Commissions"],
    summary="List my commission requests",
)
class CommissionRequestMyListView(ListAPIView):
    serializer_class = CommissionRequestSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        employee = _get_user_employee(self.request.user)
        queryset = CommissionRequest.objects.select_related("employee").filter(
            company=self.request.user.company, employee=employee
        )

        status_filter = self.request.query_params.get("status")
        if status_filter:
            status_value = status_filter.lower()
            if status_value not in CommissionRequest.Status.values:
                raise ValidationError({"status": "Invalid status value."})
            queryset = queryset.filter(status=status_value)

        date_from = _parse_date_param(
            self.request.query_params.get("date_from"), "date_from"
        )
        date_to = _parse_date_param(
            self.request.query_params.get("date_to"), "date_to"
        )
        if date_from:
            queryset = queryset.filter(earned_date__gte=date_from)
        if date_to:
            queryset = queryset.filter(earned_date__lte=date_to)

        return queryset.order_by("-requested_at")


@extend_schema(
    tags=["Commissions"],
    summary="Commission approvals inbox",
)
class CommissionApprovalsInboxView(ListAPIView):
    serializer_class = CommissionRequestSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        roles = _user_role_names(user)
        queryset = CommissionRequest.objects.select_related("employee").filter(
            company=user.company
        )

        if "manager" in roles:
            pass
        elif "hr" in roles:
            queryset = queryset.exclude(employee__user__roles__name__iexact="HR").exclude(
                employee__user__roles__name__iexact="Manager"
            )
        else:
            raise PermissionDenied("You do not have permission to view commission approvals.")

        status_filter = self.request.query_params.get("status") or CommissionRequest.Status.PENDING
        if status_filter:
            status_value = status_filter.lower()
            if status_value not in CommissionRequest.Status.values:
                raise ValidationError({"status": "Invalid status value."})
            queryset = queryset.filter(status=status_value)

        employee_id = self.request.query_params.get("employee_id")
        if employee_id:
            queryset = queryset.filter(employee_id=employee_id)

        date_from = _parse_date_param(
            self.request.query_params.get("date_from"), "date_from"
        )
        date_to = _parse_date_param(
            self.request.query_params.get("date_to"), "date_to"
        )
        if date_from:
            queryset = queryset.filter(earned_date__gte=date_from)
        if date_to:
            queryset = queryset.filter(earned_date__lte=date_to)

        employee_search = self.request.query_params.get("employee")
        if employee_search:
            queryset = queryset.filter(
                Q(employee__full_name__icontains=employee_search)
                | Q(employee__employee_code__icontains=employee_search)
            )

        return queryset.order_by("-requested_at")


@extend_schema(
    tags=["Commissions"],
    summary="Approve commission request",
    responses={200: CommissionRequestSerializer},
)
class CommissionApproveView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, id=None):
        commission_request = get_object_or_404(
            CommissionRequest, id=id, company=request.user.company
        )
        if not _user_can_approve_commission(request.user, commission_request):
            raise PermissionDenied("You do not have permission to approve this request.")

        if commission_request.status != CommissionRequest.Status.PENDING:
            raise ValidationError("Only pending requests can be approved.")

        commission_request.status = CommissionRequest.Status.APPROVED
        commission_request.decided_by = request.user
        commission_request.decided_at = timezone.now()
        commission_request.save(update_fields=["status", "decided_by", "decided_at"])
        return Response(CommissionRequestSerializer(commission_request).data)


@extend_schema(
    tags=["Commissions"],
    summary="Reject commission request",
    request=CommissionDecisionSerializer,
    responses={200: CommissionRequestSerializer},
)
class CommissionRejectView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, id=None):
        commission_request = get_object_or_404(
            CommissionRequest, id=id, company=request.user.company
        )
        if not _user_can_approve_commission(request.user, commission_request):
            raise PermissionDenied("You do not have permission to reject this request.")

        if commission_request.status != CommissionRequest.Status.PENDING:
            raise ValidationError("Only pending requests can be rejected.")

        serializer = CommissionDecisionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        commission_request.status = CommissionRequest.Status.REJECTED
        commission_request.decided_by = request.user
        commission_request.decided_at = timezone.now()
        commission_request.reject_reason = serializer.validated_data.get("reason")
        commission_request.save(
            update_fields=["status", "decided_by", "decided_at", "reject_reason"]
        )
        return Response(CommissionRequestSerializer(commission_request).data)


@extend_schema(
    tags=["Payroll"],
    summary="Create payroll period",
    request=PayrollPeriodSerializer,
    responses={201: PayrollPeriodSerializer},
)
class PayrollPeriodCreateView(ListCreateAPIView):    
    permission_classes = [IsAuthenticated]
    serializer_class = PayrollPeriodSerializer

    def get_permissions(self):
        permissions = [permission() for permission in self.permission_classes]
        if self.request.method == "GET":
            permissions.append(HasAnyPermission(["hr.payroll.view", "hr.payroll.*"]))
        else:
            permissions.append(HasAnyPermission(["hr.payroll.create", "hr.payroll.*"]))        
        return permissions

    def get_queryset(self):
        return (
            PayrollPeriod.objects.filter(company=self.request.user.company)
            .order_by("-start_date", "-id")
        )


    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


@extend_schema(
    tags=["Payroll"],
    summary="Generate payroll runs for a period",
)
class PayrollPeriodGenerateView(APIView):
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        permissions = [permission() for permission in self.permission_classes]
        permissions.append(
            HasAnyPermission(["hr.payroll.generate", "hr.payroll.*"])
        )
        return permissions

    def post(self, request, id=None):
        period = get_object_or_404(PayrollPeriod, id=id, company=request.user.company)
        if period.status == PayrollPeriod.Status.LOCKED:
            raise ValidationError({"detail": "Payroll period is locked."})

        async_result = generate_payroll_period.delay(
            period_id=period.id,
            user_id=request.user.id,
        )        
        PayrollTaskRun.objects.create(
            task_id=async_result.id,
            period=period,
            requested_by=request.user,
            status=PayrollTaskRun.Status.PENDING,
        )
        if settings.CELERY_TASK_ALWAYS_EAGER:
            return Response(async_result.result)
        return Response(
            {"task_id": async_result.id, "status": PayrollTaskRun.Status.PENDING},
            status=status.HTTP_202_ACCEPTED,
        )
        

@extend_schema(
    tags=["Payroll"],
    summary="List payroll runs for a period",
    responses={200: PayrollRunListSerializer(many=True)},
)
class PayrollPeriodRunsListView(ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = PayrollRunListSerializer

    def get_permissions(self):
        permissions = [permission() for permission in self.permission_classes]
        permissions.append(HasAnyPermission(["hr.payroll.view", "hr.payroll.*"]))
        return permissions

    def get_queryset(self):
        period = get_object_or_404(
            PayrollPeriod, id=self.kwargs["id"], company=self.request.user.company
        )
        return (
            PayrollRun.objects.filter(period=period)
            .select_related("employee")
            .order_by("employee__full_name")
        )

@extend_schema(
    tags=["Payroll"],
    summary="List my payroll runs",
    responses={200: PayrollRunListSerializer(many=True)},
)
class PayrollRunMyListView(ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = PayrollRunListSerializer
    throttle_classes = [PayslipReadWriteThrottle]
    
    def get_queryset(self):
        employee = getattr(self.request.user, "employee_profile", None)
        if not employee or employee.company_id != self.request.user.company_id:
            return PayrollRun.objects.none()
        return (
            PayrollRun.objects.filter(company=self.request.user.company, employee=employee)
            .select_related("employee")
            .order_by("-generated_at", "-id")
        )


@extend_schema(
    tags=["Payroll"],
    summary="Retrieve payroll run details",
    responses={200: PayrollRunDetailSerializer},
)
class PayrollRunDetailView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [PayslipReadWriteThrottle]
    
    def get(self, request, id=None):
        payroll_run = get_object_or_404(PayrollRun, id=id, company=request.user.company)
        has_permission = _user_has_payroll_permission(
            request.user,
            ["hr.payroll.view", "hr.payroll.*", "hr.payroll.payslip"],
        )
        if not has_permission:
            employee = getattr(request.user, "employee_profile", None)
            if not employee or employee.id != payroll_run.employee_id:
                raise PermissionDenied("You do not have permission to view this payslip.")

        serializer = PayrollRunDetailSerializer(payroll_run)
        return Response(serializer.data)


@extend_schema_view(
    retrieve=extend_schema(
        tags=["Payroll"],
        summary="Retrieve payroll run details",
        responses={200: PayrollRunDetailSerializer},
    )
)
class PayrollRunViewSet(mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = PayrollRunDetailSerializer
    throttle_classes = [PayslipReadWriteThrottle]    
    lookup_field = "id"
    lookup_url_kwarg = "id"
    lookup_value_regex = "\\d+"

    def get_queryset(self):
        return PayrollRun.objects.filter(company=self.request.user.company).select_related(
            "employee"
        )

    def retrieve(self, request, *args, **kwargs):
        payroll_run = self.get_object()
        has_permission = _user_has_payroll_permission(
            request.user,
            ["hr.payroll.view", "hr.payroll.*", "hr.payroll.payslip"],
        )
        if not has_permission:
            employee = getattr(request.user, "employee_profile", None)
            if not employee or employee.id != payroll_run.employee_id:
                raise PermissionDenied("You do not have permission to view this payslip.")
        return Response(self.get_serializer(payroll_run).data)

    @action(detail=True, methods=["post"], url_path="mark-paid")
    def mark_paid(self, request, id=None):
        if not _user_has_payroll_permission(request.user, ["hr.payroll.pay", "hr.payroll.*"]):
            raise PermissionDenied("You do not have permission to mark payroll runs as paid.")

        payroll_run = self.get_object()
        if payroll_run.status != PayrollRun.Status.PAID:
            payroll_run.status = PayrollRun.Status.PAID
            payroll_run.save(update_fields=["status", "updated_at"])
        return Response(self.get_serializer(payroll_run).data)

    @action(detail=True, methods=["get"])
    def payslip(self, request, id=None):
        payroll_run = self.get_object()
        has_permission = _user_has_payroll_permission(
            request.user,
            ["hr.payroll.view", "hr.payroll.payslip", "hr.payroll.*"],
        )
        if not has_permission:
            employee = getattr(request.user, "employee_profile", None)
            if not employee or employee.id != payroll_run.employee_id:
                raise PermissionDenied("You do not have permission to view this payslip.")

        from hr.services.payslip import render_payslip_png

        manager_name = "-"
        if request.user.is_superuser or "manager" in _user_role_names(request.user):
            manager_name = _format_user_name(request.user)
        hr_name = _format_user_name(_get_company_role_user(request.user.company, "hr"))
        png_bytes = render_payslip_png(
            payroll_run, dpi=200, manager_name=manager_name, hr_name=hr_name
        )
        if not png_bytes or png_bytes[:8] != b"\x89PNG\r\n\x1a\n":
            return HttpResponse(
                "Payslip generation failed (invalid PNG).",
                status=500,
                content_type="text/plain",
            )
        return StreamingHttpResponse(iter([png_bytes]), content_type="image/png")
    

@extend_schema(
    tags=["Payroll"],
    summary="Mark payroll run as paid",
    responses={200: PayrollRunDetailSerializer},
)
class PayrollRunMarkPaidView(APIView):
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        permissions = [permission() for permission in self.permission_classes]
        permissions.append(HasAnyPermission(["hr.payroll.pay", "hr.payroll.*"]))
        return permissions

    def post(self, request, id=None):
        payroll_run = get_object_or_404(PayrollRun, id=id, company=request.user.company)
        if payroll_run.status != PayrollRun.Status.PAID:
            payroll_run.status = PayrollRun.Status.PAID
            payroll_run.save(update_fields=["status", "updated_at"])
        serializer = PayrollRunDetailSerializer(payroll_run)
        return Response(serializer.data)


@extend_schema(
    tags=["Payroll"],
    summary="Lock payroll period",
    responses={200: PayrollPeriodSerializer},
)
class PayrollPeriodLockView(APIView):
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        permissions = [permission() for permission in self.permission_classes]
        permissions.append(HasAnyPermission(["hr.payroll.lock", "hr.payroll.*"]))
        return permissions

    def post(self, request, id=None):
        period = get_object_or_404(PayrollPeriod, id=id, company=request.user.company)
        period = lock_period(period, request.user)
        return Response(PayrollPeriodSerializer(period).data)


from django.http import HttpResponse, StreamingHttpResponse
from corsheaders.defaults import default_headers

@extend_schema(
    tags=["Payroll"],
    summary="Download payslip PDF",
)
class PayrollRunPayslipPDFView(APIView):
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        # خلّي OPTIONS من غير auth عشان الـ preflight مايتعطلش
        if self.request.method == "OPTIONS":
            return []
        return [permission() for permission in self.permission_classes]

    def _apply_cors_headers(self, request, response):
        """
        Force CORS headers for this endpoint (PDF download).
        This fixes cases where browser blocks because Access-Control-Allow-Origin is missing.
        """
        origin = request.headers.get("Origin")

        # لو Origin مش موجود لأي سبب، حط localhost:5174 كـ fallback
        fallback_origin = "http://localhost:5174"

        allow_all = getattr(settings, "CORS_ALLOW_ALL_ORIGINS", False)
        allowed_origins = getattr(settings, "CORS_ALLOWED_ORIGINS", [])
        allowed_origin_regexes = getattr(settings, "CORS_ALLOWED_ORIGIN_REGEXES", [])
        allow_credentials = getattr(settings, "CORS_ALLOW_CREDENTIALS", False)

        is_allowed_origin = False
        if origin:
            is_allowed_origin = (
                allow_all
                or origin in allowed_origins
                or any(re.match(regex, origin) for regex in allowed_origin_regexes)
            )

        # ✅ المهم: لازم الهيدر ده يكون موجود وإلا Chrome هيعمل Block
        if origin and is_allowed_origin:
            response["Access-Control-Allow-Origin"] = origin
        else:
            response["Access-Control-Allow-Origin"] = fallback_origin

        response["Vary"] = "Origin"
        response["Access-Control-Allow-Credentials"] = "true" if allow_credentials else "false"

        # ✅ headers/methods المطلوبة للـ preflight + GET
        req_headers = request.headers.get("Access-Control-Request-Headers")
        response["Access-Control-Allow-Headers"] = (
            req_headers or "authorization, content-type, accept"
        )
        response["Access-Control-Allow-Methods"] = "GET, OPTIONS"

        # ✅ لو عايز تقرأ اسم الملف من Content-Disposition في الفرونت
        response["Access-Control-Expose-Headers"] = "Content-Disposition"

        return response

    def options(self, request, *args, **kwargs):
        # لازم نرد على OPTIONS برد فيه CORS headers
        response = HttpResponse(status=200)
        return self._apply_cors_headers(request, response)

    def get(self, request, id=None):
        payroll_run = get_object_or_404(PayrollRun, id=id, company=request.user.company)

        has_permission = _user_has_payroll_permission(
            request.user,
            ["hr.payroll.view", "hr.payroll.payslip", "hr.payroll.*"],
        )
        if not has_permission:
            employee = getattr(request.user, "employee_profile", None)
            if not employee or employee.id != payroll_run.employee_id:
                raise PermissionDenied("You do not have permission to view this payslip.")

        manager_name = "-"
        if request.user.is_superuser or "manager" in _user_role_names(request.user):
            manager_name = _format_user_name(request.user)
        hr_name = _format_user_name(_get_company_role_user(request.user.company, "hr"))
        pdf_bytes = render_payslip_pdf(
            payroll_run, manager_name=manager_name, hr_name=hr_name
        )        
        filename = f"payslip-{payroll_run.id}.pdf"

        response = FileResponse(
            BytesIO(pdf_bytes),
            as_attachment=True,
            filename=filename,
            content_type="application/pdf",
        )

        return self._apply_cors_headers(request, response)


@extend_schema(
    tags=["Payroll"],
    summary="Download payslip PNG",
)
class PayrollRunPayslipPNGView(APIView):
    permission_classes = [IsAuthenticated]

    class PNGRenderer(BaseRenderer):
        media_type = "image/png"
        format = "png"

        def render(self, data, media_type=None, renderer_context=None):
            return data

    renderer_classes = [PNGRenderer]

    def get_permissions(self):
        if self.request.method == "OPTIONS":
            return []
        return [permission() for permission in self.permission_classes]

    def _apply_cors_headers(self, request, response):
        origin = request.headers.get("Origin")
        fallback_origin = "http://localhost:5174"

        allow_all = getattr(settings, "CORS_ALLOW_ALL_ORIGINS", False)
        allowed_origins = getattr(settings, "CORS_ALLOWED_ORIGINS", [])
        allowed_origin_regexes = getattr(settings, "CORS_ALLOWED_ORIGIN_REGEXES", [])
        allow_credentials = getattr(settings, "CORS_ALLOW_CREDENTIALS", False)

        is_allowed_origin = False
        if origin:
            is_allowed_origin = (
                allow_all
                or origin in allowed_origins
                or any(re.match(regex, origin) for regex in allowed_origin_regexes)
            )

        response["Access-Control-Allow-Origin"] = origin if (origin and is_allowed_origin) else fallback_origin
        response["Vary"] = "Origin"
        response["Access-Control-Allow-Credentials"] = "true" if allow_credentials else "false"

        req_headers = request.headers.get("Access-Control-Request-Headers")
        response["Access-Control-Allow-Headers"] = req_headers or "authorization, content-type, accept"
        response["Access-Control-Allow-Methods"] = "GET, OPTIONS"
        response["Access-Control-Expose-Headers"] = "Content-Disposition, Content-Length, Content-Type"
        return response

    def options(self, request, *args, **kwargs):
        resp = HttpResponse(status=200)
        return self._apply_cors_headers(request, resp)

    def get(self, request, id=None):
        payroll_run = get_object_or_404(PayrollRun, id=id, company=request.user.company)

        has_permission = _user_has_payroll_permission(
            request.user,
            ["hr.payroll.view", "hr.payroll.payslip", "hr.payroll.*"],
        )
        if not has_permission:
            employee = getattr(request.user, "employee_profile", None)
            if not employee or employee.id != payroll_run.employee_id:
                raise PermissionDenied("You do not have permission to view this payslip.")

        # Generate PNG bytes
        from hr.services.payslip import render_payslip_png

        manager_name = "-"
        if request.user.is_superuser or "manager" in _user_role_names(request.user):
            manager_name = _format_user_name(request.user)
        hr_name = _format_user_name(_get_company_role_user(request.user.company, "hr"))
        png_bytes = render_payslip_png(
            payroll_run, dpi=200, manager_name=manager_name, hr_name=hr_name
        )        
        if not png_bytes or png_bytes[:8] != b"\x89PNG\r\n\x1a\n":
            return HttpResponse("Payslip generation failed (invalid PNG).", status=500, content_type="text/plain")

        filename = f"payslip-{payroll_run.id}.png"
        resp = StreamingHttpResponse(iter([png_bytes]), content_type="image/png")        
        resp["Content-Disposition"] = f'attachment; filename="{filename}"'
        resp["Content-Length"] = str(len(png_bytes))
        resp["Cache-Control"] = "no-store"
        return self._apply_cors_headers(request, resp)