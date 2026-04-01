"""Attendance API serializers."""

from rest_framework import serializers

from hr.models import AttendanceRecord, Employee, Shift, WorkSite
from hr.serializers import DepartmentMiniSerializer


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
        read_only_fields = fields


class AttendanceActionSerializer(serializers.Serializer):
    employee_id = serializers.PrimaryKeyRelatedField(
        source="employee",
        queryset=Employee.objects.all(),
    )
    worksite_id = serializers.PrimaryKeyRelatedField(
        source="worksite",
        queryset=WorkSite.objects.all(),
        required=False,
        allow_null=True,
    )
    shift_id = serializers.PrimaryKeyRelatedField(
        source="shift",
        queryset=Shift.objects.all(),
        required=False,
        allow_null=True,
    )
    method = serializers.ChoiceField(choices=AttendanceRecord.Method.choices)
    lat = serializers.FloatField(
        required=False,
        allow_null=True,
    )
    lng = serializers.FloatField(
        required=False,
        allow_null=True,
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

    def validate_lat(self, value):
        if value is not None and not (-90 <= value <= 90):
            raise serializers.ValidationError("Latitude must be between -90 and 90.")
        return value

    def validate_lng(self, value):
        if value is not None and not (-180 <= value <= 180):
            raise serializers.ValidationError("Longitude must be between -180 and 180.")
        return value
    

class AttendanceApprovalDecisionSerializer(serializers.Serializer):
    action = serializers.ChoiceField(choices=["checkin", "checkout"])
    reason = serializers.CharField(required=False, allow_blank=True, allow_null=True)


class AttendanceSelfRequestOtpSerializer(serializers.Serializer):
    purpose = serializers.ChoiceField(choices=["checkin", "checkout"])


class AttendanceSelfVerifyOtpSerializer(serializers.Serializer):
    request_id = serializers.IntegerField()
    code = serializers.CharField(min_length=6, max_length=6)
    lat = serializers.FloatField()
    lng = serializers.FloatField()

    def validate_lat(self, value):
        if not (-90 <= value <= 90):
            raise serializers.ValidationError("Latitude must be between -90 and 90.")
        return value

    def validate_lng(self, value):
        if not (-180 <= value <= 180):
            raise serializers.ValidationError("Longitude must be between -180 and 180.")
        return value
    

class AttendancePendingItemSerializer(serializers.Serializer):
    record_id = serializers.IntegerField()
    employee_id = serializers.IntegerField()
    employee_name = serializers.CharField()
    date = serializers.DateField()
    action = serializers.ChoiceField(choices=["checkin", "checkout"])
    time = serializers.DateTimeField()
    lat = serializers.DecimalField(max_digits=18, decimal_places=6, required=False, allow_null=True)
    lng = serializers.DecimalField(max_digits=18, decimal_places=6, required=False, allow_null=True)
    distance_meters = serializers.IntegerField(required=False, allow_null=True)
    status = serializers.CharField()


class AttendanceEmailConfigSerializer(serializers.Serializer):
    mode = serializers.ChoiceField(choices=["console", "email"], required=False)
    configured = serializers.BooleanField()
    sender_email = serializers.EmailField(allow_blank=True)
    is_active = serializers.BooleanField()
    

__all__ = [
    "AttendanceActionSerializer",
    "AttendanceApprovalDecisionSerializer",
    "AttendanceEmailConfigSerializer",
    "AttendanceEmployeeSerializer",
    "AttendancePendingItemSerializer",
    "AttendanceRecordSerializer",
    "AttendanceSelfRequestOtpSerializer",
    "AttendanceSelfVerifyOtpSerializer",
]