from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, time, timedelta
from math import atan2, cos, radians, sin, sqrt
from typing import Any, Optional
import logging

from django.core import signing
from django.utils import timezone
from rest_framework import serializers
from rest_framework.exceptions import PermissionDenied

from hr.models import AttendanceRecord, Employee, Shift, WorkSite
from hr.services.policies import evaluate_attendance_record
from core.models import CompanyAttendanceQrToken


QR_TOKEN_SALT = "attendance.qr"


@dataclass(frozen=True)
class LocationPayload:
    lat: float
    lng: float


@dataclass(frozen=True)
class QrWindow:
    start: datetime
    end: datetime
    worksite: WorkSite


def _shift_start_datetime(record_date: date, shift: Shift, now_local: datetime) -> datetime:
    tz = now_local.tzinfo or timezone.get_current_timezone()
    expected_start = timezone.make_aware(datetime.combine(record_date, shift.start_time), tz)
    if shift.end_time <= shift.start_time and now_local.time() < shift.end_time:
        expected_start -= timedelta(days=1)
    return expected_start


def _shift_end_datetime(record_date: date, shift: Shift, now_local: datetime) -> datetime:
    tz = now_local.tzinfo or timezone.get_current_timezone()
    expected_end = timezone.make_aware(datetime.combine(record_date, shift.end_time), tz)
    if shift.end_time <= shift.start_time and now_local.time() >= shift.start_time:
        expected_end += timedelta(days=1)
    return expected_end


def calculate_late(record_date, shift: Shift, now: datetime) -> int:
    now_local = timezone.localtime(now)
    expected_start = _shift_start_datetime(record_date, shift, now_local)
    grace_minutes = shift.grace_minutes or 0
    grace_delta = timedelta(minutes=grace_minutes)
    if now_local > expected_start + grace_delta:
        return int((now_local - expected_start - grace_delta).total_seconds() // 60)
    return 0


def calculate_early_leave(record_date, shift: Shift, now: datetime) -> int:
    now_local = timezone.localtime(now)
    expected_end = _shift_end_datetime(record_date, shift, now_local)
    grace_minutes = shift.early_leave_grace_minutes or 0
    grace_delta = timedelta(minutes=grace_minutes)
    if now_local < expected_end - grace_delta:
        return int((expected_end - grace_delta - now_local).total_seconds() // 60)
    return 0

def distance_meters(worksite: WorkSite, lat: float, lng: float) -> int:
    earth_radius_m = 6_371_000
    lat1 = radians(float(worksite.lat))
    lng1 = radians(float(worksite.lng))
    lat2 = radians(float(lat))
    lng2 = radians(float(lng))

    dlat = lat2 - lat1
    dlng = lng2 - lng1
    a = sin(dlat / 2) ** 2 + cos(lat1) * cos(lat2) * sin(dlng / 2) ** 2
    c = 2 * atan2(sqrt(a), sqrt(1 - a))
    distance = earth_radius_m * c
    return int(distance)



def validate_location(worksite: WorkSite, lat: float, lng: float) -> int:
    """Validate location within radius; return distance meters."""
    dist = distance_meters(worksite, lat, lng)
    if dist > worksite.radius_meters:
        raise PermissionDenied("Outside allowed location")
    return dist

def _get_employee(user, employee_id: int) -> Employee:
    try:
        return Employee.objects.get(id=employee_id, company=user.company)
    except Employee.DoesNotExist as exc:
        raise serializers.ValidationError({"employee": "Employee not found."}) from exc


def _get_employee_shift(employee: Employee) -> Shift:
    if not employee.shift_id:
        raise serializers.ValidationError({"shift": "Employee must be assigned to a shift."})
    return employee.shift


def _get_location_payload(payload: dict[str, Any]) -> Optional[LocationPayload]:
    lat = payload.get("lat")
    lng = payload.get("lng")
    if lat is None or lng is None:
        return None
    return LocationPayload(lat=float(lat), lng=float(lng))


def _ensure_shift(payload: dict[str, Any]) -> Shift:
    shift = payload.get("shift")
    if not shift:
        raise serializers.ValidationError({"shift": "Shift is required."})
    return shift


def _ensure_method(payload: dict[str, Any]) -> str:
    method = payload.get("method")
    if not method:
        raise serializers.ValidationError({"method": "Method is required."})
    return method


def _validate_gps(payload: dict[str, Any]) -> LocationPayload:
    location = _get_location_payload(payload)
    if not location:
        raise serializers.ValidationError({"location": "lat/lng is required for GPS."})

    worksite = payload.get("worksite")
    if not worksite:
        raise serializers.ValidationError({"worksite": "Worksite is required for GPS."})
    dist = distance_meters(worksite, location.lat, location.lng)
    if dist > worksite.radius_meters:
        raise PermissionDenied("Outside allowed location")
    return location


def _validate_qr_location(payload: dict[str, Any], worksite: WorkSite) -> LocationPayload:
    location = _get_location_payload(payload)
    if not location:
        raise serializers.ValidationError({"location": "lat/lng is required for QR."})
    dist = distance_meters(worksite, location.lat, location.lng)
    if dist > worksite.radius_meters:
        raise PermissionDenied("Outside allowed location")
    return location


def _ensure_company_qr_settings(company) -> tuple[WorkSite, time, time]:
    if not company.attendance_qr_worksite_id:
        raise serializers.ValidationError(
            {"qr_token": "Company QR worksite is not configured."}
        )
    if not company.attendance_qr_start_time or not company.attendance_qr_end_time:
        raise serializers.ValidationError(
            {"qr_token": "Company QR schedule is not configured."}
        )
    return (
        company.attendance_qr_worksite,
        company.attendance_qr_start_time,
        company.attendance_qr_end_time,
    )


def _get_qr_window(company, issued_for: date) -> QrWindow:
    worksite, start_time, end_time = _ensure_company_qr_settings(company)
    tz = timezone.get_current_timezone()
    start_at = timezone.make_aware(datetime.combine(issued_for, start_time), tz)
    end_at = timezone.make_aware(datetime.combine(issued_for, end_time), tz)
    if end_time <= start_time:
        end_at += timedelta(days=1)
    return QrWindow(start=start_at, end=end_at, worksite=worksite)


def generate_qr_token(
    user,
) -> dict[str, Any]:
    """Return today's stable QR token for the user's company.

    We persist the signed token per (company, issued_for) so the QR image stays the same
    for the whole day and rotates every 24 hours.
    """
    issued_for = timezone.localdate()
    window = _get_qr_window(user.company, issued_for)

    existing = CompanyAttendanceQrToken.objects.filter(
        company=user.company, issued_for=issued_for
    ).first()
    if existing:
        return {
            "token": existing.token,
            "valid_from": existing.valid_from,
            "valid_until": existing.valid_until,
            "worksite_id": existing.worksite_id,
        }

    payload = {
        "company_id": user.company_id,
        "worksite_id": window.worksite.id,
        "issued_for": issued_for.isoformat(),
    }
    token = signing.dumps(payload, salt=QR_TOKEN_SALT)

    CompanyAttendanceQrToken.objects.create(
        company=user.company,
        issued_for=issued_for,
        token=token,
        valid_from=window.start,
        valid_until=window.end,
        worksite=window.worksite,
    )

    return {
        "token": token,
        "valid_from": window.start,
        "valid_until": window.end,
        "worksite_id": window.worksite.id,
    }


def _parse_issued_for(value: str | None) -> date:
    if not value:
        raise serializers.ValidationError({"qr_token": "Invalid QR token."})
    return date.fromisoformat(value)


def _resolve_qr_payload(payload: dict[str, Any], company) -> WorkSite:
    token = payload.get("qr_token")
    if not token:
        raise serializers.ValidationError({"qr_token": "QR token is required."})
    
    try:
        data = signing.loads(token, salt=QR_TOKEN_SALT)
    except signing.BadSignature as exc:
        raise serializers.ValidationError({"qr_token": "Invalid QR token."}) from exc

    if data.get("company_id") != company.id:
        raise serializers.ValidationError({"qr_token": "QR token not valid for company."})

    worksite_id = data.get("worksite_id")
    issued_for = _parse_issued_for(data.get("issued_for"))

    # Token must match the persisted daily token for this company.
    stored = CompanyAttendanceQrToken.objects.filter(company=company, issued_for=issued_for).first()
    if not stored or stored.token != token:
        raise serializers.ValidationError({"qr_token": "Invalid QR token."})

    if not worksite_id:
        raise serializers.ValidationError({"qr_token": "Invalid QR token payload."})

    window = _get_qr_window(company, issued_for)
    if window.worksite.id != worksite_id:
        raise serializers.ValidationError({"qr_token": "QR token not valid for company."})

    payload["worksite"] = stored.worksite
    return stored.worksite

def check_in(
    user,
    employee_id: int,
    payload: dict[str, Any],
    *,
    timestamp: datetime | None = None,
) -> AttendanceRecord:
    method = _ensure_method(payload)    
    now = timestamp or timezone.now()    
    record_date = timezone.localdate(now)
    
    employee = _get_employee(user, employee_id)
    existing_record = AttendanceRecord.objects.filter(
        company=user.company, employee=employee, date=record_date
    ).first()
    if existing_record and existing_record.check_in_time:
        raise serializers.ValidationError("Already checked in for today.")

    if method == AttendanceRecord.Method.QR:
        shift = _get_employee_shift(employee)
        worksite = _resolve_qr_payload(payload, user.company)
    else:
        shift = _ensure_shift(payload)

    location = None
    if method == AttendanceRecord.Method.GPS:
        location = _validate_gps(payload)
    elif method == AttendanceRecord.Method.QR:
        location = _validate_qr_location(payload, worksite)
    else:
        location = _get_location_payload(payload)
                
    late_minutes = calculate_late(record_date, shift, now)
    status = (
        AttendanceRecord.Status.LATE
        if late_minutes > 0
        else AttendanceRecord.Status.PRESENT
    )

    if existing_record is None:
        record = AttendanceRecord.objects.create(
            company=user.company,
            employee=employee,
            date=record_date,
            check_in_time=now,
            check_in_lat=location.lat if location else None,
            check_in_lng=location.lng if location else None,
            method=method,
            status=status,
            late_minutes=late_minutes,
        )
        evaluate_attendance_record(record)
        return record

    existing_record.check_in_time = now
    existing_record.check_in_lat = location.lat if location else None    
    existing_record.check_in_lng = location.lng if location else None
    existing_record.method = method
    existing_record.status = status
    existing_record.late_minutes = late_minutes
    existing_record.save(
        update_fields=[
            "check_in_time",
            "check_in_lat",
            "check_in_lng",
            "method",
            "status",
            "late_minutes",
            "updated_at",
        ]
    )
    evaluate_attendance_record(existing_record)
    return existing_record


def check_out(
    user,
    employee_id: int,
    payload: dict[str, Any],
    *,
    timestamp: datetime | None = None,
) -> AttendanceRecord:
    method = _ensure_method(payload)
    now = timestamp or timezone.now()    
    record_date = timezone.localdate(now)

    employee = _get_employee(user, employee_id)
    record = AttendanceRecord.objects.filter(
        company=user.company, employee=employee, date=record_date
    ).first()
    if not record or not record.check_in_time or record.check_out_time:
        raise serializers.ValidationError("No open check-in for today.")

    if method == AttendanceRecord.Method.QR:
        shift = _get_employee_shift(employee)
        worksite = _resolve_qr_payload(payload, user.company)
    else:
        shift = _ensure_shift(payload)
    location = None
    if method == AttendanceRecord.Method.GPS:
        location = _validate_gps(payload)
    elif method == AttendanceRecord.Method.QR:
        location = _validate_qr_location(payload, worksite)
    else:
        location = _get_location_payload(payload)
        
    early_leave_minutes = calculate_early_leave(record_date, shift, now)
    status = record.status
    if early_leave_minutes > 0 and status != AttendanceRecord.Status.LATE:
        status = AttendanceRecord.Status.EARLY_LEAVE

    record.check_out_time = now
    record.check_out_lat = location.lat if location else None
    record.check_out_lng = location.lng if location else None
    record.method = method
    record.status = status
    record.early_leave_minutes = early_leave_minutes
    record.save(
        update_fields=[
            "check_out_time",
            "check_out_lat",
            "check_out_lng",
            "method",
            "status",
            "early_leave_minutes",
            "updated_at",
        ]
    )
    return record


import secrets
import hashlib
from django.conf import settings
from django.core.mail import send_mail
from hr.models import AttendanceOtpRequest

OTP_VALID_SECONDS = 60
OTP_MODE_CONSOLE = "console"
OTP_MODE_EMAIL = "email"

logger = logging.getLogger(__name__)


def _hash_otp(code: str, salt: str) -> str:
    return hashlib.sha256(f"{salt}:{code}".encode("utf-8")).hexdigest()


def _get_attendance_worksite(company) -> WorkSite:
    # Reuse the configured worksite on Company (was used for QR schedule).
    if getattr(company, "attendance_qr_worksite_id", None):
        return company.attendance_qr_worksite
    ws = WorkSite.objects.filter(company=company, is_active=True).order_by("id").first()
    if not ws:
        raise serializers.ValidationError({"worksite": "No active worksite configured for company."})
    return ws


def _get_otp_mode() -> str:
    mode = (getattr(settings, "ATTENDANCE_OTP_MODE", OTP_MODE_CONSOLE) or OTP_MODE_CONSOLE).strip().lower()
    if mode not in {OTP_MODE_CONSOLE, OTP_MODE_EMAIL}:
        return OTP_MODE_CONSOLE
    return mode


def _send_otp_email(*, to_email: str, code: str, purpose: str) -> None:    
    sender_email = getattr(settings, 'ATTENDANCE_OTP_SENDER_EMAIL', None)
    app_password = getattr(settings, 'ATTENDANCE_OTP_APP_PASSWORD', None)

    if not sender_email or not app_password:
        raise serializers.ValidationError({
            'email_config': 'OTP email sender is not configured. '
                           'Set ATTENDANCE_OTP_SENDER_EMAIL and ATTENDANCE_OTP_APP_PASSWORD.'
        })
        
    send_mail(
        subject="Your Attendance OTP Code",
        message=f"Your OTP code is: {code}",
        from_email=getattr(settings, "DEFAULT_FROM_EMAIL", sender_email),
        recipient_list=[to_email],
        fail_silently=False,
    )

def _dispatch_attendance_otp(*, user, code: str, purpose: str) -> str:
    mode = _get_otp_mode()
    if mode == OTP_MODE_EMAIL:
        try:
            _send_otp_email(to_email=user.email, code=code, purpose=purpose)
        except serializers.ValidationError:
            logger.warning(
                "ATTENDANCE_OTP_SEND_FAILED mode=email user_id=%s company_id=%s reason=email_config_missing",
                user.id,
                user.company_id,
            )
            raise
        except Exception as exc:
            logger.error("OTP EMAIL FAILED: %s", str(exc))
            raise serializers.ValidationError({"email": "Failed to send OTP email. Please try again."}) from exc
        logger.info("OTP EMAIL SENT to %s", user.email)
        logger.info(
            "ATTENDANCE_OTP_SEND_SUCCESS mode=email user_id=%s company_id=%s purpose=%s",
            user.id,            
            user.company_id,
            purpose,
        )
        return OTP_MODE_EMAIL

    logger.info(
        "ATTENDANCE_OTP_CONSOLE mode=console user_id=%s company_id=%s purpose=%s",
        user.id,
        user.company_id,
        purpose,
    )
    if settings.DEBUG:
        logger.info(
            "ATTENDANCE_OTP_DEBUG_CODE mode=console user_id=%s company_id=%s otp=%s",
            user.id,
            user.company_id,
            code,
        )
    return OTP_MODE_CONSOLE


def request_self_attendance_otp(user, purpose: str) -> dict[str, Any]:    
    employee = getattr(user, "employee_profile", None)
    if not employee:
        raise serializers.ValidationError({"employee": "This user is not linked to an employee profile."})
    if not user.email:
        raise serializers.ValidationError({"email": "User email is required to send OTP."})

    code = f"{secrets.randbelow(1_000_000):06d}"
    salt = secrets.token_hex(16)
    otp = AttendanceOtpRequest.objects.create(
        company=user.company,
        user=user,
        purpose=purpose,
        code_salt=salt,
        code_hash=_hash_otp(code, salt),
        expires_at=timezone.now() + timedelta(seconds=OTP_VALID_SECONDS),
    )

    mode_used = _dispatch_attendance_otp(user=user, code=code, purpose=purpose)
    return {"request_id": otp.id, "expires_in": OTP_VALID_SECONDS, "mode": mode_used}


def verify_self_attendance_otp(user, *, request_id: int, code: str, lat: float, lng: float) -> AttendanceRecord:
    employee = getattr(user, "employee_profile", None)
    if not employee:
        raise serializers.ValidationError({"employee": "This user is not linked to an employee profile."})

    otp = AttendanceOtpRequest.objects.filter(company=user.company, user=user, id=request_id).first()
    if not otp:
        raise serializers.ValidationError({"otp": "OTP request not found."})
    if otp.used_at:
        raise serializers.ValidationError({"otp": "OTP request already used."})
    if otp.is_expired():
        raise serializers.ValidationError({"otp": "OTP request expired."})
    if otp.attempts >= otp.max_attempts:
        raise serializers.ValidationError({"otp": "Too many attempts."})

    otp.attempts += 1
    otp.save(update_fields=["attempts", "updated_at"])

    if _hash_otp(code, otp.code_salt) != otp.code_hash:
        raise serializers.ValidationError({"code": "Invalid code."})

    # Mark used
    otp.mark_used()

    worksite = _get_attendance_worksite(user.company)
    dist = distance_meters(worksite, lat, lng)
    if dist > worksite.radius_meters:
        raise PermissionDenied("Outside allowed location")

    now = timezone.now()
    record_date = timezone.localdate(now)

    # Ensure shift exists
    shift = _get_employee_shift(employee)

    if otp.purpose == AttendanceOtpRequest.Purpose.CHECK_IN:
        existing_record = AttendanceRecord.objects.filter(company=user.company, employee=employee, date=record_date).first()
        if existing_record and existing_record.check_in_time:
            raise serializers.ValidationError("Already checked in for today.")

        late_minutes = calculate_late(record_date, shift, now)
        status = AttendanceRecord.Status.LATE if late_minutes > 0 else AttendanceRecord.Status.PRESENT

        if existing_record is None:
            record = AttendanceRecord.objects.create(
                company=user.company,
                employee=employee,
                date=record_date,
                check_in_time=now,
                check_in_lat=lat,
                check_in_lng=lng,
                check_in_distance_meters=dist,
                check_in_approval_status=AttendanceRecord.ApprovalStatus.PENDING,
                method=AttendanceRecord.Method.EMAIL_OTP,
                status=status,
                late_minutes=late_minutes,
            )
        else:
            existing_record.check_in_time = now
            existing_record.check_in_lat = lat
            existing_record.check_in_lng = lng
            existing_record.check_in_distance_meters = dist
            existing_record.check_in_approval_status = AttendanceRecord.ApprovalStatus.PENDING
            existing_record.check_in_approved_by = None
            existing_record.check_in_approved_at = None
            existing_record.check_in_rejection_reason = None
            existing_record.method = AttendanceRecord.Method.EMAIL_OTP
            existing_record.status = status
            existing_record.late_minutes = late_minutes
            existing_record.save()
            record = existing_record

        evaluate_attendance_record(record)
        return record

    # CHECK_OUT
    record = AttendanceRecord.objects.filter(company=user.company, employee=employee, date=record_date).first()
    if not record or not record.check_in_time or record.check_out_time:
        raise serializers.ValidationError("No open check-in for today.")

    early_leave_minutes = calculate_early_leave(record_date, shift, now)
    status = record.status
    if early_leave_minutes > 0 and status != AttendanceRecord.Status.LATE:
        status = AttendanceRecord.Status.EARLY_LEAVE

    record.check_out_time = now
    record.check_out_lat = lat
    record.check_out_lng = lng
    record.check_out_distance_meters = dist
    record.check_out_approval_status = AttendanceRecord.ApprovalStatus.PENDING
    record.check_out_approved_by = None
    record.check_out_approved_at = None
    record.check_out_rejection_reason = None
    record.method = AttendanceRecord.Method.EMAIL_OTP
    record.status = status
    record.early_leave_minutes = early_leave_minutes
    record.save()
    return record


def approve_attendance_action(*, approver, record: AttendanceRecord, action: str) -> AttendanceRecord:
    if action == "checkin":
        if not record.check_in_time:
            raise serializers.ValidationError({"action": "No check-in to approve."})
        record.check_in_approval_status = AttendanceRecord.ApprovalStatus.APPROVED
        record.check_in_approved_by = approver
        record.check_in_approved_at = timezone.now()
        record.check_in_rejection_reason = None
        record.save()
        return record
    if action == "checkout":
        if not record.check_out_time:
            raise serializers.ValidationError({"action": "No check-out to approve."})
        record.check_out_approval_status = AttendanceRecord.ApprovalStatus.APPROVED
        record.check_out_approved_by = approver
        record.check_out_approved_at = timezone.now()
        record.check_out_rejection_reason = None
        record.save()
        return record
    raise serializers.ValidationError({"action": "Invalid action."})


def reject_attendance_action(*, approver, record: AttendanceRecord, action: str, reason: str | None = None) -> AttendanceRecord:
    if action == "checkin":
        if not record.check_in_time:
            raise serializers.ValidationError({"action": "No check-in to reject."})
        record.check_in_approval_status = AttendanceRecord.ApprovalStatus.REJECTED
        record.check_in_approved_by = approver
        record.check_in_approved_at = timezone.now()
        record.check_in_rejection_reason = reason or "Rejected"
        record.save()
        return record
    if action == "checkout":
        if not record.check_out_time:
            raise serializers.ValidationError({"action": "No check-out to reject."})
        record.check_out_approval_status = AttendanceRecord.ApprovalStatus.REJECTED
        record.check_out_approved_by = approver
        record.check_out_approved_at = timezone.now()
        record.check_out_rejection_reason = reason or "Rejected"
        record.save()
        return record
    raise serializers.ValidationError({"action": "Invalid action."})
