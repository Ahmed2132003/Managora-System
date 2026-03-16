from django.contrib.auth import get_user_model
from django.db import IntegrityError
from rest_framework import serializers

from decimal import Decimal, InvalidOperation, ROUND_HALF_UP


class CoordinateField(serializers.Field):
    """Accepts float/str/Decimal and returns a Decimal rounded to 6 dp.
    Designed to tolerate very long fractional inputs coming from GPS.
    """

    def to_internal_value(self, data):
        try:
            if data is None:
                raise serializers.ValidationError("This field is required.")
            # Convert via string to avoid float representation issues.
            d = Decimal(str(data))
        except (InvalidOperation, ValueError, TypeError):
            raise serializers.ValidationError("A valid number is required.")

        # Round to 6 decimal places (GPS precision) to keep DB-compatible.
        q = Decimal("0.000001")
        d = d.quantize(q, rounding=ROUND_HALF_UP)

        return d

    def to_representation(self, value):
        try:
            return str(Decimal(value))
        except Exception:
            return str(value)


from core.permissions import is_admin_user
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
    CommissionRequest,
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

User = get_user_model()


class DepartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Department
        fields = ("id", "name", "is_active")


class JobTitleSerializer(serializers.ModelSerializer):
    class Meta:
        model = JobTitle
        fields = ("id", "name", "is_active")


class DepartmentMiniSerializer(serializers.ModelSerializer):
    class Meta:
        model = Department
        fields = ("id", "name")


class JobTitleMiniSerializer(serializers.ModelSerializer):
    class Meta:
        model = JobTitle
        fields = ("id", "name")


class ManagerMiniSerializer(serializers.ModelSerializer):
    class Meta:
        model = Employee
        fields = ("id", "full_name")


class ShiftMiniSerializer(serializers.ModelSerializer):
    class Meta:
        model = Shift
        fields = ("id", "name")


class ShiftSerializer(serializers.ModelSerializer):
    class Meta:
        model = Shift
        fields = (
            "id",
            "name",
            "start_time",
            "end_time",
            "grace_minutes",
            "early_leave_grace_minutes",
            "min_work_minutes",
            "is_active",
        )
        read_only_fields = ("id",)


class WorkSiteSerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkSite
        fields = ("id", "name", "lat", "lng", "radius_meters", "is_active")
        read_only_fields = ("id",)


class UserMiniSerializer(serializers.ModelSerializer):
    roles = serializers.SlugRelatedField(many=True, read_only=True, slug_field="name")

    class Meta:
        model = User
        fields = ("id", "username", "email", "roles")


class EmployeeSerializer(serializers.ModelSerializer):
    department = DepartmentMiniSerializer(read_only=True)
    job_title = JobTitleMiniSerializer(read_only=True)
    manager = ManagerMiniSerializer(read_only=True)
    shift = ShiftMiniSerializer(read_only=True)

    class Meta:
        model = Employee
        fields = (
            "id",
            "employee_code",
            "full_name",
            "status",
            "hire_date",
            "department",
            "job_title",
            "manager",
            "shift",
        )


class EmployeeDetailSerializer(serializers.ModelSerializer):
    department = DepartmentMiniSerializer(read_only=True)
    job_title = JobTitleMiniSerializer(read_only=True)
    manager = ManagerMiniSerializer(read_only=True)
    shift = ShiftMiniSerializer(read_only=True)

    class Meta:
        model = Employee
        fields = (
            "id",
            "employee_code",
            "full_name",
            "national_id",
            "hire_date",
            "status",
            "department",
            "job_title",
            "manager",
            "shift",
            "user",
        )


class EmployeeDefaultsSerializer(serializers.Serializer):
    manager = ManagerMiniSerializer(allow_null=True)
    shift = ShiftMiniSerializer(allow_null=True)


class EmployeeCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Employee
        fields = (
            "id",
            "employee_code",
            "full_name",
            "national_id",
            "hire_date",
            "status",
            "department",
            "job_title",
            "manager",
            "user",
            "shift",
        )
        read_only_fields = ("id",)
        
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            company = request.user.company
            self.fields["department"].queryset = Department.objects.filter(
                company=company
            )
            self.fields["job_title"].queryset = JobTitle.objects.filter(
                company=company
            )
            self.fields["manager"].queryset = Employee.objects.filter(company=company)
            self.fields["user"].queryset = User.objects.filter(company=company)
            self.fields["shift"].queryset = Shift.objects.filter(company=company)
            
    def validate(self, attrs):
        if "company" in self.initial_data:
            raise serializers.ValidationError({"company": "This field is not allowed."})

        request = self.context.get("request")
        company = request.user.company if request else None

        manager = attrs.get("manager")
        if manager and manager.company_id != company.id:
            raise serializers.ValidationError({"manager": "Manager must belong to the same company."})
        if manager and manager.is_deleted:
            raise serializers.ValidationError({"manager": "Manager is deleted."})

        department = attrs.get("department")
        if department and department.company_id != company.id:
            raise serializers.ValidationError({"department": "Department must belong to the same company."})

        job_title = attrs.get("job_title")
        if job_title and job_title.company_id != company.id:
            raise serializers.ValidationError({"job_title": "Job title must belong to the same company."})

        shift = attrs.get("shift")
        if shift and shift.company_id != company.id:
            raise serializers.ValidationError({"shift": "Shift must belong to the same company."})

        user = attrs.get("user")
        if user and user.company_id != company.id:
            raise serializers.ValidationError({"user": "User must belong to the same company."})

        if user and request:
            actor = request.user
            if not actor.is_superuser and not is_admin_user(actor):
                actor_roles = {
                    name.strip().lower() for name in actor.roles.values_list("name", flat=True)
                }
                allowed_roles = None
                if "manager" in actor_roles or "hr" in actor_roles:
                    allowed_roles = None
                if allowed_roles is not None:
                    user_roles = {
                        name.strip().lower()
                        for name in user.roles.values_list("name", flat=True)
                    }                    
                    if not user_roles.intersection(allowed_roles):
                        raise serializers.ValidationError(
                            {"user": "User role is not allowed for this action."}
                        )

        return attrs
    
    def validate_employee_code(self, value):
        if not value:
            raise serializers.ValidationError("employee_code is required.")

        request = self.context.get("request")
        if not request:
            return value

        company = request.user.company
        queryset = Employee.objects.filter(company=company, employee_code=value)
        if self.instance:
            queryset = queryset.exclude(pk=self.instance.pk)
        if queryset.exists():
            raise serializers.ValidationError("employee_code must be unique per company.")
        return value

    def create(self, validated_data):
        request = self.context.get("request")
        company = request.user.company
        from hr.services.defaults import (
            ensure_default_shifts,
            get_company_manager,
            get_default_shift,
        )

        validated_data["company"] = company
        ensure_default_shifts(company)
        if not validated_data.get("manager"):
            validated_data["manager"] = get_company_manager(company)
        if not validated_data.get("shift"):
            validated_data["shift"] = get_default_shift(company)
        return super().create(validated_data)

    def update(self, instance, validated_data):
        validated_data.pop("company", None)
        return super().update(instance, validated_data)


class EmployeeDocumentSerializer(serializers.ModelSerializer):
    uploaded_by = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = EmployeeDocument
        fields = (
            "id",
            "employee",
            "doc_type",
            "category",
            "title",
            "linked_entity_type",
            "linked_entity_id",
            "file",
            "ocr_text",
            "uploaded_by",
            "created_at",
        )


class EmployeeDocumentCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmployeeDocument
        fields = (
            "id",
            "doc_type",
            "category",
            "title",
            "linked_entity_type",
            "linked_entity_id",
            "file",
            "ocr_text",
        )
        read_only_fields = ("id", "ocr_text")
        
    def validate(self, attrs):
        request = self.context.get("request")
        employee = self.context.get("employee")
        if not request or not employee:
            return attrs

        if employee.company_id != request.user.company_id:
            raise serializers.ValidationError(
                {"employee": "Employee must belong to the same company."}
            )
        if employee.is_deleted:
            raise serializers.ValidationError(
                {"employee": "Cannot upload documents for deleted employee."}
            )
        return attrs

    def create(self, validated_data):
        request = self.context.get("request")
        employee = self.context.get("employee")
        validated_data["company"] = employee.company
        validated_data["employee"] = employee
        validated_data["uploaded_by"] = request.user if request else None
        file_obj = validated_data.get("file")
        title = (validated_data.get("title") or "").strip()
        filename = getattr(file_obj, "name", "")
        validated_data["ocr_text"] = " ".join(
            part for part in [title, filename] if part
        ).strip()
        return super().create(validated_data)
    

class AttendanceEmployeeSerializer(serializers.ModelSerializer):
    department = DepartmentMiniSerializer(read_only=True)

    class Meta:
        model = Employee
        fields = ("id", "employee_code", "full_name", "department")


class AttendanceRecordSerializer(serializers.ModelSerializer):
    employee = AttendanceEmployeeSerializer(read_only=True)

    class Meta:
        model = AttendanceRecord
        fields = (
            "id",
            "employee",
            "date",
            "check_in_time",
            "check_out_time",
            "check_in_lat",
            "check_in_lng",
            "check_out_lat",
            "check_out_lng",
            "check_in_distance_meters",
            "check_out_distance_meters",
            "check_in_approval_status",
            "check_out_approval_status",
            "check_in_approved_by",
            "check_out_approved_by",
            "check_in_approved_at",
            "check_out_approved_at",
            "check_in_rejection_reason",
            "check_out_rejection_reason",
            "method",
            "status",
            "late_minutes",
            "early_leave_minutes",
            "notes",
        )


class AttendanceSelfRequestOtpSerializer(serializers.Serializer):
    purpose = serializers.ChoiceField(choices=["checkin", "checkout"])


class AttendanceSelfVerifyOtpSerializer(serializers.Serializer):
    request_id = serializers.IntegerField()
    code = serializers.CharField(min_length=6, max_length=6)
    lat = CoordinateField()
    lng = CoordinateField()


class AttendanceApproveRejectSerializer(serializers.Serializer):
    action = serializers.ChoiceField(choices=["checkin", "checkout"])
    reason = serializers.CharField(required=False, allow_blank=True, allow_null=True)


class AttendancePendingItemSerializer(serializers.Serializer):
    record_id = serializers.IntegerField()
    employee_id = serializers.IntegerField()
    employee_name = serializers.CharField()
    date = serializers.DateField()
    action = serializers.ChoiceField(choices=["checkin", "checkout"])
    time = serializers.DateTimeField()
    lat = serializers.DecimalField(max_digits=9, decimal_places=6, required=False, allow_null=True)
    lng = serializers.DecimalField(max_digits=9, decimal_places=6, required=False, allow_null=True)
    distance_meters = serializers.IntegerField(required=False, allow_null=True)
    status = serializers.CharField()


class AttendanceEmailConfigUpsertSerializer(serializers.Serializer):
    sender_email = serializers.EmailField()
    app_password = serializers.CharField(min_length=4, max_length=256)
    is_active = serializers.BooleanField(default=True)



class AttendanceActionSerializer(serializers.Serializer):
    employee_id = serializers.PrimaryKeyRelatedField(
        source="employee", queryset=Employee.objects.none()
    )
    worksite_id = serializers.PrimaryKeyRelatedField(
        source="worksite", queryset=WorkSite.objects.none(), required=False, allow_null=True
    )
    shift_id = serializers.PrimaryKeyRelatedField(
        source="shift", queryset=Shift.objects.none(), required=False, allow_null=True
    )
    method = serializers.ChoiceField(choices=AttendanceRecord.Method.choices)
    lat = serializers.DecimalField(
        max_digits=9, decimal_places=6, required=False, allow_null=True
    )
    lng = serializers.DecimalField(
        max_digits=9, decimal_places=6, required=False, allow_null=True
    )
    qr_token = serializers.CharField(required=False, allow_blank=False)
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            company = request.user.company
            self.fields["employee_id"].queryset = Employee.objects.filter(company=company)
            self.fields["worksite_id"].queryset = WorkSite.objects.filter(company=company)
            self.fields["shift_id"].queryset = Shift.objects.filter(company=company)

    def validate(self, attrs):
        method = attrs.get("method")
        shift = attrs.get("shift")
        worksite = attrs.get("worksite")
        lat = attrs.get("lat")
        lng = attrs.get("lng")

        if method != AttendanceRecord.Method.QR and not shift:
            raise serializers.ValidationError({"shift_id": "shift_id is required."})
        if method == AttendanceRecord.Method.QR and not attrs.get("qr_token"):
            raise serializers.ValidationError({"qr_token": "qr_token is required."})

        if (lat is None) ^ (lng is None):
            raise serializers.ValidationError({"location": "Both lat and lng are required."})

        if method == AttendanceRecord.Method.QR and (lat is None or lng is None):
            raise serializers.ValidationError({"location": "lat/lng is required for QR."})

        if method == AttendanceRecord.Method.GPS:
            if not worksite:
                raise serializers.ValidationError({"worksite_id": "worksite_id is required for GPS."})
            if lat is None or lng is None:
                raise serializers.ValidationError({"location": "lat/lng is required for GPS."})

        return attrs


class AttendanceQrGenerateSerializer(serializers.Serializer):
    worksite_id = serializers.PrimaryKeyRelatedField(
        source="worksite", queryset=WorkSite.objects.none(), required=False, allow_null=True
    )
    shift_id = serializers.PrimaryKeyRelatedField(
        source="shift", queryset=Shift.objects.none(), required=False, allow_null=True
    )
    expires_in_minutes = serializers.IntegerField(
        required=False, min_value=1, max_value=1440
    )
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            company = request.user.company
            self.fields["worksite_id"].queryset = WorkSite.objects.filter(company=company)
            self.fields["shift_id"].queryset = Shift.objects.filter(company=company)

    def validate(self, attrs):
        attrs.setdefault("expires_in_minutes", 60)
        return attrs


class AttendanceQrTokenSerializer(serializers.Serializer):
    token = serializers.CharField()
    valid_from = serializers.DateTimeField()
    valid_until = serializers.DateTimeField()
    worksite_id = serializers.IntegerField()
    

class LeaveTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = LeaveType
        fields = (
            "id",
            "name",
            "code",
            "requires_approval",
            "paid",
            "max_per_request_days",
            "allow_negative_balance",
            "is_active",
        )


class LeaveBalanceSerializer(serializers.ModelSerializer):
    remaining_days = serializers.SerializerMethodField()

    class Meta:
        model = LeaveBalance
        fields = (
            "id",
            "employee",
            "leave_type",
            "year",
            "allocated_days",
            "used_days",
            "carryover_days",
            "remaining_days",
        )

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            company = request.user.company
            self.fields["employee"].queryset = Employee.objects.filter(company=company)
            self.fields["leave_type"].queryset = LeaveType.objects.filter(company=company)

    def get_remaining_days(self, obj):
        return obj.remaining_days

    def validate(self, attrs):
        request = self.context.get("request")
        company = request.user.company if request else None
        allow_upsert = self.context.get("allow_upsert", False)
        
        employee = attrs.get("employee") or getattr(self.instance, "employee", None)
        if employee and company and employee.company_id != company.id:
            raise serializers.ValidationError(
                {"employee": "Employee must belong to the same company."}
            )

        leave_type = attrs.get("leave_type") or getattr(self.instance, "leave_type", None)
        if leave_type and company and leave_type.company_id != company.id:
            raise serializers.ValidationError(
                {"leave_type": "Leave type must belong to the same company."}
            )

        year = attrs.get("year") or getattr(self.instance, "year", None)
        if company and employee and leave_type and year:
            balance_exists = LeaveBalance.objects.filter(
                company=company,
                employee=employee,
                leave_type=leave_type,
                year=year,
            )
            if self.instance:
                balance_exists = balance_exists.exclude(id=self.instance.id)
            if balance_exists.exists() and not (allow_upsert and not self.instance):                
                raise serializers.ValidationError(
                    {
                        "non_field_errors": [
                            "A leave balance for this employee, leave type, and year already exists."
                        ]
                    }
                )

        return attrs

    def create(self, validated_data):
        try:
            return super().create(validated_data)
        except IntegrityError as exc:
            raise serializers.ValidationError(
                {
                    "non_field_errors": [
                        "A leave balance for this employee, leave type, and year already exists."
                    ]
                }
            ) from exc

class LeaveEmployeeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Employee
        fields = ("id", "employee_code", "full_name")


class LeaveRequestSerializer(serializers.ModelSerializer):
    employee = LeaveEmployeeSerializer(read_only=True)
    leave_type = LeaveTypeSerializer(read_only=True)
    decided_by = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = LeaveRequest
        fields = (
            "id",
            "employee",
            "leave_type",
            "start_date",
            "end_date",
            "days",
            "reason",
            "status",
            "requested_at",
            "decided_at",
            "decided_by",
            "reject_reason",
        )


class LeaveRequestCreateSerializer(serializers.ModelSerializer):
    leave_type_id = serializers.PrimaryKeyRelatedField(
        source="leave_type", queryset=LeaveType.objects.none()
    )

    class Meta:
        model = LeaveRequest
        fields = ("id", "leave_type_id", "start_date", "end_date", "reason")
        read_only_fields = ("id",)

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            company = request.user.company
            self.fields["leave_type_id"].queryset = LeaveType.objects.filter(
                company=company, is_active=True
            )

    def validate(self, attrs):
        employee = self.context.get("employee")
        if not employee:
            raise serializers.ValidationError("Employee profile is required.")
        attrs["employee"] = employee
        return attrs

    def create(self, validated_data):
        from hr.services.leaves import request_leave

        user = self.context["request"].user
        return request_leave(user, validated_data)


class LeaveDecisionSerializer(serializers.Serializer):
    reason = serializers.CharField(required=False, allow_blank=True, allow_null=True)


class CommissionRequestSerializer(serializers.ModelSerializer):
    employee = LeaveEmployeeSerializer(read_only=True)
    decided_by = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = CommissionRequest
        fields = (
            "id",
            "employee",
            "amount",
            "earned_date",
            "note",
            "status",
            "requested_at",
            "decided_at",
            "decided_by",
            "reject_reason",
        )
        read_only_fields = ("id", "status", "requested_at", "decided_at", "decided_by")


class CommissionRequestCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = CommissionRequest
        fields = ("id", "amount", "earned_date", "note")
        read_only_fields = ("id",)

    def validate(self, attrs):
        employee = self.context.get("employee")
        if not employee:
            raise serializers.ValidationError("Employee profile is required.")
        attrs["employee"] = employee
        return attrs

    def create(self, validated_data):
        request = self.context["request"]
        validated_data["company"] = request.user.company
        return super().create(validated_data)


class CommissionDecisionSerializer(serializers.Serializer):
    reason = serializers.CharField(required=False, allow_blank=True, allow_null=True)

class PolicyRuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = PolicyRule
        fields = (
            "id",
            "name",
            "rule_type",
            "threshold",
            "period_days",
            "action_type",
            "action_value",
            "is_active",
        )


class PolicyRuleSummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = PolicyRule
        fields = ("id", "name", "rule_type")


class HRActionSerializer(serializers.ModelSerializer):
    employee = LeaveEmployeeSerializer(read_only=True)
    rule = PolicyRuleSummarySerializer(read_only=True)
    
    class Meta:
        model = HRAction
        fields = (
            "id",
            "employee",
            "rule",
            "action_type",
            "value",
            "reason",
            "period_start",
            "period_end",
            "attendance_record",
            "created_at",
        )


class HRActionManageSerializer(serializers.ModelSerializer):
    employee = LeaveEmployeeSerializer(read_only=True)
    rule = PolicyRuleSummarySerializer(read_only=True)

    class Meta:
        model = HRAction
        fields = (
            "id",
            "employee",
            "rule",
            "action_type",
            "value",
            "reason",
            "period_start",
            "period_end",
            "attendance_record",
            "created_at",
        )
        read_only_fields = (
            "id",
            "employee",
            "rule",
            "attendance_record",
            "created_at",
        )

    def validate(self, attrs):
        instance = getattr(self, "instance", None)
        period_start = attrs.get(
            "period_start", instance.period_start if instance else None
        )
        period_end = attrs.get("period_end", instance.period_end if instance else None)
        if period_start and period_end and period_start > period_end:
            raise serializers.ValidationError(
                {"period_end": "Period end must be after the start date."}
            )
        if instance and period_start and period_end:
            period_exists = PayrollPeriod.objects.filter(
                company=instance.company,
                start_date=period_start,
                end_date=period_end,
            ).exists()
            if not period_exists:
                raise serializers.ValidationError(
                    {"period_start": "Selected period does not exist for this company."}
                )
        return attrs
    
    def update(self, instance, validated_data):
        action = super().update(instance, validated_data)
        from hr.services.actions import sync_hr_action_deduction_component

        sync_hr_action_deduction_component(action)
        return action

class PayrollPeriodSerializer(serializers.ModelSerializer):
    class Meta:
        model = PayrollPeriod
        fields = (
            "id",
            "period_type",
            "year",
            "month",
            "start_date",
            "end_date",
            "status",
            "locked_at",
            "created_by",
        )
        read_only_fields = ("id",)
        extra_kwargs = {
            "year": {"required": False},
            "month": {"required": False},
            "start_date": {"required": False},
            "end_date": {"required": False},
        }
        
    def validate(self, attrs):
        if "company" in self.initial_data:
            raise serializers.ValidationError({"company": "This field is not allowed."})
        request = self.context.get("request")
        company = request.user.company if request else None
        created_by = attrs.get("created_by")
        if created_by and company and created_by.company_id != company.id:
            raise serializers.ValidationError({"created_by": "User must belong to the same company."})
        period_type = attrs.get(
            "period_type",
            getattr(self.instance, "period_type", PayrollPeriod.PeriodType.MONTHLY),
        )        
        start_date = attrs.get("start_date", getattr(self.instance, "start_date", None))
        end_date = attrs.get("end_date", getattr(self.instance, "end_date", None))
        year = attrs.get("year", getattr(self.instance, "year", None))
        month = attrs.get("month", getattr(self.instance, "month", None))

        if period_type == PayrollPeriod.PeriodType.MONTHLY:
            if not year or not month:
                raise serializers.ValidationError(
                    {"month": "Month and year are required for monthly periods."}
                )
        else:
            if not start_date or not end_date:
                raise serializers.ValidationError(
                    {"start_date": "Start date and end date are required."}
                )
            if start_date > end_date:
                raise serializers.ValidationError({"end_date": "End date must be after start date."})
            if period_type == PayrollPeriod.PeriodType.DAILY and start_date != end_date:
                raise serializers.ValidationError(
                    {"end_date": "Daily payroll periods must be a single day."}
                )
        return attrs

    def create(self, validated_data):
        request = self.context.get("request")
        validated_data["company"] = request.user.company
        if not validated_data.get("year") and validated_data.get("start_date"):
            validated_data["year"] = validated_data["start_date"].year
        if not validated_data.get("month") and validated_data.get("start_date"):
            validated_data["month"] = validated_data["start_date"].month
        return super().create(validated_data)
    
    def update(self, instance, validated_data):
        validated_data.pop("company", None)
        return super().update(instance, validated_data)


class SalaryStructureSerializer(serializers.ModelSerializer):
    class Meta:
        model = SalaryStructure
        
        fields = ("id", "employee", "basic_salary", "salary_type", "currency")        
        read_only_fields = ("id",)

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            self.fields["employee"].queryset = Employee.objects.filter(
                company=request.user.company
            )

    def validate(self, attrs):
        if "company" in self.initial_data:
            raise serializers.ValidationError({"company": "This field is not allowed."})
        request = self.context.get("request")
        company = request.user.company if request else None
        employee = attrs.get("employee")
        if employee and company and employee.company_id != company.id:
            raise serializers.ValidationError({"employee": "Employee must belong to the same company."})
        return attrs

    def create(self, validated_data):
        request = self.context.get("request")
        validated_data["company"] = request.user.company
        return super().create(validated_data)

    def update(self, instance, validated_data):
        validated_data.pop("company", None)
        return super().update(instance, validated_data)


class SalaryComponentSerializer(serializers.ModelSerializer):
    class Meta:
        model = SalaryComponent
        fields = (
            "id",
            "salary_structure",
            "payroll_period",
            "name",
            "type",
            "amount",
            "is_recurring",
            "created_at",
        )
        read_only_fields = ("id", "created_at")
                
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            self.fields["salary_structure"].queryset = SalaryStructure.objects.filter(
                company=request.user.company
            )
            self.fields["payroll_period"].queryset = PayrollPeriod.objects.filter(
                company=request.user.company
            )

    def validate(self, attrs):
        if "company" in self.initial_data:
            raise serializers.ValidationError({"company": "This field is not allowed."})
        request = self.context.get("request")
        company = request.user.company if request else None
        salary_structure = attrs.get("salary_structure") or getattr(self.instance, "salary_structure", None)
        payroll_period = attrs.get("payroll_period") or getattr(self.instance, "payroll_period", None)
        is_recurring = attrs.get("is_recurring")
        if salary_structure and company and salary_structure.company_id != company.id:
            raise serializers.ValidationError(
                {"salary_structure": "Salary structure must belong to the same company."}
            )
        if not self.instance and payroll_period is None:
            raise serializers.ValidationError({"payroll_period": "Payroll period is required."})
        if payroll_period and company and payroll_period.company_id != company.id:
            raise serializers.ValidationError(
                {"payroll_period": "Payroll period must belong to the same company."}
            )
        if salary_structure and payroll_period:
            salary_type = salary_structure.salary_type
            expected_period_type = (
                PayrollPeriod.PeriodType.MONTHLY
                if salary_type == SalaryStructure.SalaryType.COMMISSION
                else salary_type
            )
            if payroll_period.period_type != expected_period_type:
                raise serializers.ValidationError(
                    {"payroll_period": "Payroll period type must match the employee salary type."}
                )
        if payroll_period and (is_recurring is True or (is_recurring is None and getattr(self.instance, "is_recurring", True))):
            attrs["is_recurring"] = False
        return attrs
    
    def create(self, validated_data):
        request = self.context.get("request")
        validated_data["company"] = request.user.company
        return super().create(validated_data)

    def update(self, instance, validated_data):
        validated_data.pop("company", None)
        return super().update(instance, validated_data)


class LoanAdvanceSerializer(serializers.ModelSerializer):
    class Meta:
        model = LoanAdvance
        fields = (
            "id",
            "employee",
            "type",
            "principal_amount",
            "start_date",
            "installment_amount",
            "remaining_amount",
            "status",
        )
        read_only_fields = ("id",)

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            self.fields["employee"].queryset = Employee.objects.filter(
                company=request.user.company
            )

    def validate(self, attrs):
        if "company" in self.initial_data:
            raise serializers.ValidationError({"company": "This field is not allowed."})
        request = self.context.get("request")
        company = request.user.company if request else None
        employee = attrs.get("employee")
        if employee and company and employee.company_id != company.id:
            raise serializers.ValidationError({"employee": "Employee must belong to the same company."})
        return attrs

    def create(self, validated_data):
        request = self.context.get("request")
        validated_data["company"] = request.user.company
        return super().create(validated_data)

    def update(self, instance, validated_data):
        validated_data.pop("company", None)
        return super().update(instance, validated_data)


class PayrollRunSerializer(serializers.ModelSerializer):
    class Meta:
        model = PayrollRun
        fields = (
            "id",
            "period",
            "employee",
            "status",
            "earnings_total",
            "deductions_total",
            "net_total",
            "generated_at",
            "generated_by",
        )
        read_only_fields = ("id",)

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            company = request.user.company
            self.fields["period"].queryset = PayrollPeriod.objects.filter(company=company)
            self.fields["employee"].queryset = Employee.objects.filter(company=company)
            self.fields["generated_by"].queryset = User.objects.filter(company=company)

    def validate(self, attrs):
        if "company" in self.initial_data:
            raise serializers.ValidationError({"company": "This field is not allowed."})
        request = self.context.get("request")
        company = request.user.company if request else None
        period = attrs.get("period")
        if period and company and period.company_id != company.id:
            raise serializers.ValidationError({"period": "Period must belong to the same company."})
        employee = attrs.get("employee")
        if employee and company and employee.company_id != company.id:
            raise serializers.ValidationError({"employee": "Employee must belong to the same company."})
        generated_by = attrs.get("generated_by")
        if generated_by and company and generated_by.company_id != company.id:
            raise serializers.ValidationError(
                {"generated_by": "User must belong to the same company."}
            )
        return attrs

    def create(self, validated_data):
        request = self.context.get("request")
        validated_data["company"] = request.user.company
        return super().create(validated_data)

    def update(self, instance, validated_data):
        validated_data.pop("company", None)
        return super().update(instance, validated_data)


class PayrollEmployeeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Employee
        fields = ("id", "employee_code", "full_name")


class PayrollLineDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = PayrollLine
        fields = ("id", "code", "name", "type", "amount", "meta")


class PayrollRunListSerializer(serializers.ModelSerializer):
    employee = PayrollEmployeeSerializer(read_only=True)

    class Meta:
        model = PayrollRun
        fields = (
            "id",
            "employee",
            "status",
            "earnings_total",
            "deductions_total",
            "net_total",
        )


class PayrollRunDetailSerializer(serializers.ModelSerializer):
    employee = PayrollEmployeeSerializer(read_only=True)
    period = PayrollPeriodSerializer(read_only=True)
    lines = PayrollLineDetailSerializer(many=True, read_only=True)

    class Meta:
        model = PayrollRun
        fields = (
            "id",
            "period",
            "employee",
            "status",
            "earnings_total",
            "deductions_total",
            "net_total",
            "generated_at",
            "generated_by",
            "lines",
        )


class PayrollLineSerializer(serializers.ModelSerializer):    
    class Meta:
        model = PayrollLine
        fields = ("id", "payroll_run", "code", "name", "type", "amount", "meta")
        read_only_fields = ("id",)

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            self.fields["payroll_run"].queryset = PayrollRun.objects.filter(
                company=request.user.company
            )

    def validate(self, attrs):
        if "company" in self.initial_data:
            raise serializers.ValidationError({"company": "This field is not allowed."})
        request = self.context.get("request")
        company = request.user.company if request else None
        payroll_run = attrs.get("payroll_run")
        if payroll_run and company and payroll_run.company_id != company.id:
            raise serializers.ValidationError(
                {"payroll_run": "Payroll run must belong to the same company."}
            )
        return attrs

    def create(self, validated_data):
        request = self.context.get("request")
        validated_data["company"] = request.user.company
        return super().create(validated_data)

    def update(self, instance, validated_data):
        validated_data.pop("company", None)
        return super().update(instance, validated_data)