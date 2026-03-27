from __future__ import annotations

from rest_framework import serializers

from core.services.two_factor import (
    decrypt_secret,
    encrypt_secret,
    generate_backup_codes,
    generate_totp_secret,
    provisioning_qr_base64,
    provisioning_uri,
    verify_totp,
)


class TwoFASetupSerializer(serializers.Serializer):
    otp_auth_url = serializers.CharField(read_only=True)
    qr_code_base64 = serializers.CharField(read_only=True)

    def create(self, validated_data):
        user = self.context["request"].user
        secret = generate_totp_secret()
        user.otp_secret = encrypt_secret(secret)
        user.is_2fa_enabled = False
        user.save(update_fields=["otp_secret", "is_2fa_enabled"])

        uri = provisioning_uri(email=user.email or user.username, secret=secret)
        return {
            "otp_auth_url": uri,
            "qr_code_base64": provisioning_qr_base64(uri),
        }


class TwoFAVerifyActivationSerializer(serializers.Serializer):
    otp_code = serializers.CharField(max_length=16)

    def validate(self, attrs):
        user = self.context["request"].user
        secret = decrypt_secret(user.otp_secret)
        code = attrs["otp_code"].strip().replace(" ", "")
        if not secret or not verify_totp(secret=secret, code=code):
            raise serializers.ValidationError({"otp_code": "Invalid OTP code."})
        return attrs

    def save(self, **kwargs):
        user = self.context["request"].user
        _, hashed_codes = generate_backup_codes()
        user.is_2fa_enabled = True
        user.backup_codes = hashed_codes
        user.save(update_fields=["is_2fa_enabled", "backup_codes"])
        return user


class TwoFADisableSerializer(serializers.Serializer):
    password = serializers.CharField()

    def validate(self, attrs):
        user = self.context["request"].user
        if not user.check_password(attrs["password"]):
            raise serializers.ValidationError({"password": "Invalid password."})
        return attrs

    def save(self, **kwargs):
        user = self.context["request"].user
        user.is_2fa_enabled = False
        user.otp_secret = ""
        user.backup_codes = []
        user.save(update_fields=["is_2fa_enabled", "otp_secret", "backup_codes"])
        return user


class TwoFABackupCodesSerializer(serializers.Serializer):
    codes = serializers.ListField(child=serializers.CharField(), read_only=True)

    def create(self, validated_data):
        user = self.context["request"].user
        plain_codes, hashed_codes = generate_backup_codes()
        user.backup_codes = hashed_codes
        user.save(update_fields=["backup_codes"])
        return {"codes": plain_codes}