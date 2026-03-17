from django.contrib import admin

from hr.models import (
    AttendanceRecord,
    Department,
    Employee,
    EmployeeDocument,
    HRAction,
    JobTitle,
    LeaveBalance,
    LeaveRequest,
    LeaveType,
    LoanAdvance,
    PayrollLine,
    PayrollPeriod,
    PayrollRun,
    PolicyRule,
    SalaryComponent,
    SalaryStructure,
    Shift,
    WorkSite,
)


@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "company", "is_active", "is_deleted", "created_at")
    list_filter = ("company", "is_active", "is_deleted")
    search_fields = ("name", "company__name")
    ordering = ("company", "name")


@admin.register(JobTitle)
class JobTitleAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "company", "is_active", "is_deleted", "created_at")
    list_filter = ("company", "is_active", "is_deleted")
    search_fields = ("name", "company__name")
    ordering = ("company", "name")


@admin.register(Employee)
class EmployeeAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "employee_code",
        "full_name",
        "company",
        "status",
        "shift",
        "department",
        "job_title",
        "manager",
        "is_deleted",
    )
    list_filter = ("company", "status", "is_deleted")
    search_fields = ("employee_code", "full_name", "national_id")
    ordering = ("company", "employee_code")
    autocomplete_fields = ("department", "job_title", "manager", "user", "shift")
    

@admin.register(EmployeeDocument)
class EmployeeDocumentAdmin(admin.ModelAdmin):
    list_display = ("id", "company", "employee", "doc_type", "title", "uploaded_by")
    list_filter = ("company", "doc_type")
    search_fields = ("title", "employee__full_name")
    ordering = ("-created_at",)
    autocomplete_fields = ("employee", "uploaded_by")


@admin.register(WorkSite)
class WorkSiteAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "name",
        "company",
        "lat",
        "lng",
        "radius_meters",
        "is_active",
    )
    list_filter = ("company", "is_active")
    search_fields = ("name", "company__name")
    ordering = ("company", "name")


@admin.register(Shift)
class ShiftAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "name",
        "company",
        "start_time",
        "end_time",
        "grace_minutes",
        "early_leave_grace_minutes",
        "min_work_minutes",
        "is_active",
    )
    list_filter = ("company", "is_active")
    search_fields = ("name", "company__name")
    ordering = ("company", "name")


@admin.register(AttendanceRecord)
class AttendanceRecordAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "company",
        "employee",
        "date",
        "check_in_time",
        "check_out_time",
        "method",
        "status",
        "late_minutes",
        "early_leave_minutes",
    )
    list_filter = ("company", "status", "method")
    search_fields = ("employee__full_name", "employee__employee_code")
    ordering = ("-date", "employee")
    autocomplete_fields = ("employee",)


@admin.register(PolicyRule)
class PolicyRuleAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "name",
        "company",
        "rule_type",
        "threshold",
        "period_days",
        "action_type",
        "action_value",
        "is_active",
    )
    list_filter = ("company", "rule_type", "action_type", "is_active")
    search_fields = ("name", "company__name")
    ordering = ("company", "name")


@admin.register(HRAction)
class HRActionAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "company",
        "employee",
        "rule",
        "attendance_record",
        "action_type",
        "value",
        "period_start",
        "period_end",
        "created_at",
    )
    list_filter = ("company", "action_type", "rule")
    search_fields = ("employee__full_name", "employee__employee_code", "rule__name")
    ordering = ("-created_at",)
    autocomplete_fields = ("employee", "rule", "attendance_record")


@admin.register(LeaveType)
class LeaveTypeAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "name",
        "code",
        "company",
        "requires_approval",
        "paid",
        "requires_balance",
        "max_per_request_days",
        "allow_negative_balance",
        "is_active",
    )
    list_filter = ("company", "is_active", "requires_approval", "paid")
    search_fields = ("name", "code", "company__name")
    ordering = ("company", "name")


@admin.register(LeaveBalance)
class LeaveBalanceAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "company",
        "employee",
        "leave_type",
        "year",
        "allocated_days",
        "used_days",
        "carryover_days",
    )
    list_filter = ("company", "year", "leave_type")
    search_fields = ("employee__full_name", "leave_type__name")
    ordering = ("company", "employee", "year")
    autocomplete_fields = ("employee", "leave_type")


@admin.register(LeaveRequest)
class LeaveRequestAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "company",
        "employee",
        "leave_type",
        "start_date",
        "end_date",
        "days",
        "status",
        "requested_at",
        "decided_at",
        "decided_by",
    )
    list_filter = ("company", "status", "leave_type")
    search_fields = ("employee__full_name", "leave_type__name")
    ordering = ("-requested_at",)
    autocomplete_fields = ("employee", "leave_type", "decided_by")


@admin.register(PayrollPeriod)
class PayrollPeriodAdmin(admin.ModelAdmin):
    list_display = ("id", "company", "year", "month", "status", "locked_at", "created_at")
    list_filter = ("company", "status", "year", "month")
    search_fields = ("company__name",)
    ordering = ("-year", "-month", "company")
    autocomplete_fields = ("created_by",)


@admin.register(SalaryStructure)
class SalaryStructureAdmin(admin.ModelAdmin):
    list_display = ("id", "company", "employee", "basic_salary", "currency", "created_at")
    list_filter = ("company", "currency")
    search_fields = ("employee__full_name", "employee__employee_code")
    ordering = ("company", "employee")
    autocomplete_fields = ("employee",)


@admin.register(SalaryComponent)
class SalaryComponentAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "company",
        "salary_structure",
        "name",
        "type",
        "amount",
        "is_recurring",
    )
    list_filter = ("company", "type", "is_recurring")
    search_fields = ("name", "salary_structure__employee__full_name")
    ordering = ("company", "name")
    autocomplete_fields = ("salary_structure",)


@admin.register(LoanAdvance)
class LoanAdvanceAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "company",
        "employee",
        "type",
        "principal_amount",
        "remaining_amount",
        "status",
        "start_date",
    )
    list_filter = ("company", "type", "status")
    search_fields = ("employee__full_name", "employee__employee_code")
    ordering = ("-start_date",)
    autocomplete_fields = ("employee",)


@admin.register(PayrollRun)
class PayrollRunAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "company",
        "period",
        "employee",
        "status",
        "earnings_total",
        "deductions_total",
        "net_total",
        "generated_at",
    )
    list_filter = ("company", "status", "period__year", "period__month")
    search_fields = ("employee__full_name", "employee__employee_code")
    ordering = ("-created_at",)
    autocomplete_fields = ("period", "employee", "generated_by")


@admin.register(PayrollLine)
class PayrollLineAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "company",
        "payroll_run",
        "code",
        "name",
        "type",
        "amount",
    )
    list_filter = ("company", "type")
    search_fields = ("code", "name", "payroll_run__employee__full_name")
    ordering = ("-created_at",)
    autocomplete_fields = ("payroll_run",)