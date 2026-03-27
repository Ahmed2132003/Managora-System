from __future__ import annotations

from django.contrib.auth import authenticate, get_user_model
from django.contrib.auth.models import update_last_login
from django.utils import timezone
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.settings import api_settings
from rest_framework_simplejwt.tokens import RefreshToken

from core.services.two_factor import (
    clear_failed_otp_attempts,
    consume_backup_code,
    decrypt_secret,
    is_otp_temporarily_blocked,
    issue_login_temp_token,
    maybe_block_user_after_failures,
    verify_login_temp_token,
    verify_totp,
)
from core.services.abuse import clear_failures, is_ip_blocked, register_failure

class LoginSerializer(TokenObtainPairSerializer):
    """Custom login serializer with defensive error handling."""

    def validate(self, attrs):
        request = self.context.get("request")
        ip = request.META.get("REMOTE_ADDR", "") if request else ""
        if is_ip_blocked(ip):
            raise serializers.ValidationError({"detail": "Too many failed login attempts. Try again later."})

        user_model = get_user_model()        
        username_field = user_model.USERNAME_FIELD
        raw_username = (
            attrs.get(username_field)
            or attrs.get("username")
            or attrs.get("email")
            or ""
        )
        password = attrs.get("password") or ""

        if not raw_username:
            raise serializers.ValidationError({"detail": "Username or email is required."})
        if not password:
            raise serializers.ValidationError({"detail": "Password is required."})

        if username_field != "email" and "@" in raw_username:
            try:
                user = user_model._default_manager.get(email__iexact=raw_username)
                raw_username = getattr(user, username_field)
            except user_model.DoesNotExist:
                pass

        try:
            user = authenticate(
                self.context.get("request"),
                **{username_field: raw_username, "password": password},
            )
        except Exception as exc:
            raise serializers.ValidationError(
                {"detail": "Unable to authenticate with provided credentials."}
            ) from exc

        if not user:
            register_failure(ip, kind="login")
            raise serializers.ValidationError(
                {"detail": "No active account found with the given credentials."},
                code="authorization",
            )            
        if not getattr(user, "is_active", False):
            raise serializers.ValidationError(
                {"detail": "Account is disabled."},
                code="authorization",
            )
        if getattr(user, "company_id", None) is None:
            raise serializers.ValidationError(
                {"detail": "User is not linked to a company."},
                code="authorization",
            )

        company = getattr(user, "company", None)
        now = timezone.now()
        if company and company.subscription_expires_at and company.subscription_expires_at <= now:
            company.is_active = False
            company.save(update_fields=["is_active"])


        if company and not company.is_active:
            raise serializers.ValidationError(
                {"detail": "Company subscription is inactive. Please subscribe now."},
                code="authorization",
            )
        clear_failures(ip, kind="login")
        
        if getattr(user, "is_2fa_enabled", False):
            temp_token = issue_login_temp_token(
                user_id=user.id,
                ip=ip,
            )
            data = {
                "requires_2fa": True,
                "temp_token": temp_token,
            }
        else:
            refresh = self.get_token(user)
            data = {"refresh": str(refresh), "access": str(refresh.access_token)}

        if api_settings.UPDATE_LAST_LOGIN:
            update_last_login(None, user)

        return data


class TwoFALoginVerifySerializer(serializers.Serializer):
    temp_token = serializers.CharField()
    otp_code = serializers.CharField(max_length=16, trim_whitespace=True)

    def validate(self, attrs):
        request = self.context["request"]
        ip = request.META.get("REMOTE_ADDR", "")
        user_id = verify_login_temp_token(temp_token=attrs["temp_token"], ip=ip)
        if not user_id:
            raise serializers.ValidationError({"detail": "Invalid or expired 2FA token."})

        user = get_user_model().objects.filter(id=user_id, is_active=True).first()
        if not user or not user.is_2fa_enabled:
            raise serializers.ValidationError({"detail": "Invalid authentication state."})
        if is_otp_temporarily_blocked(user_id=user.id):
            raise serializers.ValidationError({"detail": "Too many failed OTP attempts. Try later."})

        secret = decrypt_secret(user.otp_secret)
        otp_code = attrs["otp_code"].strip().replace(" ", "")
        valid = bool(secret and verify_totp(secret=secret, code=otp_code))

        if not valid:
            matched_backup, remaining = consume_backup_code(
                hashed_codes=list(user.backup_codes or []),
                provided_code=otp_code,
            )
            valid = matched_backup
            if matched_backup:
                user.backup_codes = remaining
                user.save(update_fields=["backup_codes"])

        if not valid:
            maybe_block_user_after_failures(user_id=user.id)
            raise serializers.ValidationError({"detail": "Invalid OTP or backup code."})

        clear_failed_otp_attempts(user_id=user.id)
        refresh = RefreshToken.for_user(user)
        if api_settings.UPDATE_LAST_LOGIN:
            update_last_login(None, user)

        return {"refresh": str(refresh), "access": str(refresh.access_token)}