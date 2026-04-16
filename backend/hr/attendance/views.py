"""Attendance REST API implemented with DRF ViewSets and actions."""

from __future__ import annotations

from django.utils.dateparse import parse_date
from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from core.api_views.base import ThrottledInitialMixin
from core.permissions import PermissionByActionMixin
from core.tenancy import CompanyScopedViewSet
from core.throttles import AttendanceReadWriteThrottle
from hr.models import AttendanceRecord
from hr.attendance.serializers import (
    AttendanceActionSerializer,
    AttendanceApprovalDecisionSerializer,
    AttendanceCodeGenerateSerializer,
    AttendanceCodeSubmitSerializer,
    AttendanceEmailConfigSerializer,
    AttendancePendingItemSerializer,
    AttendanceRecordSerializer,
    AttendanceSelfRequestOtpSerializer,
    AttendanceSelfVerifyOtpSerializer,
    ManualAttendanceCreateSerializer,
)
from hr.attendance.permissions import CanUseAttendanceSelfService
from hr.attendance.services import (
    approve_attendance,
    create_manual_attendance,
    generate_rotating_attendance_code,
    get_attendance_queryset,    
    get_email_config_payload,
    get_my_attendance_queryset,
    get_pending_approval_items,
    parse_date_range,
    perform_check_in,
    perform_check_out,
    perform_self_otp_verification,
    reject_attendance,
    request_self_attendance_otp,
    submit_code_attendance,
)
from hr.api_views import ShiftViewSet, WorkSiteViewSet



def _parse_date_param(value, label):
    if not value:
        return None
    parsed = parse_date(value)
    if not parsed:
        raise ValidationError({label: "Invalid date format. Use YYYY-MM-DD."})
    return parsed


@extend_schema_view(
    list=extend_schema(tags=["Attendance"], summary="List attendance records"),
    retrieve=extend_schema(tags=["Attendance"], summary="Retrieve attendance record"),
    partial_update=extend_schema(tags=["Attendance"], summary="Partially update attendance record"),
    destroy=extend_schema(tags=["Attendance"], summary="Delete attendance record"),
)
class AttendanceViewSet(ThrottledInitialMixin, PermissionByActionMixin, CompanyScopedViewSet):
    serializer_class = AttendanceRecordSerializer
    permission_scopes = ["self"]
    permission_classes = [IsAuthenticated]
    # Use higher read capacity for dashboard/profile queries while preserving write protection.
    throttle_classes = [AttendanceReadWriteThrottle]     
    permission_map = {
        "list": "attendance.*",
        "retrieve": "attendance.*",
        "partial_update": "attendance.*",
        "destroy": "attendance.*",
        "pending": ["attendance.*", "approvals.*"],
        "approve": ["attendance.*", "approvals.*"],
        "reject": ["attendance.*", "approvals.*"],
        "manual": ["attendance.*", "approvals.*"],
        "code": ["attendance.*", "approvals.*"],
    }        
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]
    queryset = AttendanceRecord.objects.all()

    def get_queryset(self):        
        if self.action == "mine":
            date_from = _parse_date_param(self.request.query_params.get("date_from"), "date_from")
            date_to = _parse_date_param(self.request.query_params.get("date_to"), "date_to")
            date_from, date_to = parse_date_range(date_from, date_to, default_days=30)
            return get_my_attendance_queryset(
                user=self.request.user,
                date_from=date_from,
                date_to=date_to,
            )

        if self.action in {"approve", "reject", "retrieve", "partial_update", "destroy"}:
            return get_attendance_queryset(user=self.request.user)

        date_from = _parse_date_param(self.request.query_params.get("date_from"), "date_from")
        date_to = _parse_date_param(self.request.query_params.get("date_to"), "date_to")
        return get_attendance_queryset(
            user=self.request.user,
            filters={
                "date_from": date_from,
                "date_to": date_to,
                "employee_id": self.request.query_params.get("employee_id"),
                "department_id": self.request.query_params.get("department_id"),
                "status": self.request.query_params.get("status"),
                "search": self.request.query_params.get("search"),
            },
        )

    def create(self, request, *args, **kwargs):
        raise ValidationError(
            {
                "detail": "POST /attendance/ is not supported. Use /attendance/check-in/ or /attendance/check-out/."
            }
        )

    @extend_schema(
        tags=["Attendance"],
        summary="Create a check-in event",
        request=AttendanceActionSerializer,
        responses={201: AttendanceRecordSerializer},
    )
    @action(
        detail=False,
        methods=["post"],
        permission_classes=[IsAuthenticated, CanUseAttendanceSelfService],
        url_path="check-in",
    )
    def check_in(self, request):
        serializer = AttendanceActionSerializer(data=request.data, context={"request": request})        
        serializer.is_valid(raise_exception=True)
        attendance = perform_check_in(actor=request.user, payload=serializer.validated_data)                
        return Response(
            AttendanceRecordSerializer(attendance).data,
            status=status.HTTP_201_CREATED,
        )

    @extend_schema(
        tags=["Attendance"],
        summary="Create a check-out event",
        request=AttendanceActionSerializer,
        responses={200: AttendanceRecordSerializer},
    )
    @action(
        detail=False,
        methods=["post"],
        permission_classes=[IsAuthenticated, CanUseAttendanceSelfService],
        url_path="check-out",
    )
    def check_out(self, request):
        serializer = AttendanceActionSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        attendance = perform_check_out(actor=request.user, payload=serializer.validated_data)
        return Response(AttendanceRecordSerializer(attendance).data)

    @extend_schema(
        tags=["Attendance"],
        summary="List the authenticated employee's attendance records",
        responses={200: AttendanceRecordSerializer(many=True)},
    )
    @action(detail=False, methods=["get"], permission_classes=[IsAuthenticated], url_path="mine")
    def mine(self, request):
        queryset = self.filter_queryset(self.get_queryset())
        serializer = AttendanceRecordSerializer(queryset, many=True)
        return Response(serializer.data)

    @extend_schema(
        tags=["Attendance"],
        summary="Request an OTP for self-service attendance",
        request=AttendanceSelfRequestOtpSerializer,
        responses={201: dict},
    )
    @action(
        detail=False,
        methods=["post"],
        permission_classes=[IsAuthenticated, CanUseAttendanceSelfService],
        url_path="request-otp",
    )
    def request_otp(self, request):
        serializer = AttendanceSelfRequestOtpSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        payload = request_self_attendance_otp(request.user, serializer.validated_data["purpose"])
        return Response(payload, status=status.HTTP_201_CREATED)

    @extend_schema(
        tags=["Attendance"],
        summary="Verify a self-service OTP and create/update attendance",
        request=AttendanceSelfVerifyOtpSerializer,
        responses={201: AttendanceRecordSerializer},
    )
    @action(
        detail=False,
        methods=["post"],
        permission_classes=[IsAuthenticated, CanUseAttendanceSelfService],
        url_path="verify-otp",
    )
    def verify_otp(self, request):
        serializer = AttendanceSelfVerifyOtpSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        attendance = perform_self_otp_verification(actor=request.user, payload=serializer.validated_data)
        return Response(
            AttendanceRecordSerializer(attendance).data,
            status=status.HTTP_201_CREATED,
        )

    @extend_schema(
        tags=["Attendance"],
        summary="Get or refresh attendance OTP email configuration",
        request=None,
        responses={200: AttendanceEmailConfigSerializer},
    )
    @action(detail=False, methods=["get", "post"], permission_classes=[IsAuthenticated], url_path="email-config")
    def email_config(self, request):
        serializer = AttendanceEmailConfigSerializer(get_email_config_payload())
        return Response(serializer.data)

    @extend_schema(
        tags=["Attendance"],
        summary="List pending attendance approval items",
        responses={200: AttendancePendingItemSerializer(many=True)},
    )
    @action(detail=False, methods=["get"], url_path="pending")
    def pending(self, request):
        date_from = _parse_date_param(request.query_params.get("date_from"), "date_from")
        date_to = _parse_date_param(request.query_params.get("date_to"), "date_to")
        items = get_pending_approval_items(
            user=request.user,
            date_from=date_from,
            date_to=date_to,
        )
        serializer = AttendancePendingItemSerializer(items, many=True)
        return Response(serializer.data)

    @extend_schema(
        tags=["Attendance"],
        summary="Create manual attendance (HR/Manager only)",
        request=ManualAttendanceCreateSerializer,
        responses={201: AttendanceRecordSerializer},
    )
    @action(detail=False, methods=["post"], url_path="manual")
    def manual(self, request):
        serializer = ManualAttendanceCreateSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        attendance = create_manual_attendance(actor=request.user, payload=serializer.validated_data)
        return Response(AttendanceRecordSerializer(attendance).data, status=status.HTTP_201_CREATED)

    @extend_schema(
        tags=["Attendance"],
        summary="Generate a rotating attendance code (HR/Manager only)",
        request=None,
        responses={200: AttendanceCodeGenerateSerializer},
    )
    @action(detail=False, methods=["get"], url_path="code")
    def code(self, request):
        purpose = request.query_params.get("purpose", "checkin")
        if purpose not in {"checkin", "checkout"}:
            raise ValidationError({"purpose": "purpose must be checkin or checkout."})
        payload = generate_rotating_attendance_code(actor=request.user, purpose=purpose)
        return Response(payload, status=status.HTTP_200_OK)
    
    @extend_schema(
        tags=["Attendance"],
        summary="Submit attendance code (employee)",
        request=AttendanceCodeSubmitSerializer,
        responses={201: AttendanceRecordSerializer},
    )
    @action(detail=False, methods=["post"], url_path="code/submit")
    def submit_code(self, request):
        serializer = AttendanceCodeSubmitSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        attendance = submit_code_attendance(
            actor=request.user,
            code=serializer.validated_data["code"],
            purpose=serializer.validated_data["purpose"],
        )
        return Response(AttendanceRecordSerializer(attendance).data, status=status.HTTP_201_CREATED)
        
    @extend_schema(
        tags=["Attendance"],
        summary="Approve a pending attendance action",
        request=AttendanceApprovalDecisionSerializer,
        responses={200: AttendanceRecordSerializer},
    )
    @action(detail=True, methods=["post"], url_path="approve")
    def approve(self, request, pk=None):
        serializer = AttendanceApprovalDecisionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        action = serializer.validated_data.get("action") or "checkin"
        attendance = approve_attendance(
            attendance=self.get_object(),
            approved_by=request.user,
            approval_action=action,
        )
        return Response(AttendanceRecordSerializer(attendance).data)
    
    @extend_schema(
        tags=["Attendance"],
        summary="Reject a pending attendance action",
        request=AttendanceApprovalDecisionSerializer,
        responses={200: AttendanceRecordSerializer},
    )
    @action(detail=True, methods=["post"], url_path="reject")
    def reject(self, request, pk=None):
        serializer = AttendanceApprovalDecisionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        action = serializer.validated_data.get("action") or "checkin"
        attendance = reject_attendance(
            attendance=self.get_object(),
            rejected_by=request.user,
            approval_action=action,
            reason=serializer.validated_data.get("reason"),
        )
        return Response(AttendanceRecordSerializer(attendance).data)
    

__all__ = ["AttendanceViewSet", "ShiftViewSet", "WorkSiteViewSet"]