from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import override_settings
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from core.models import Company
from core.services.two_factor import current_totp_code, decrypt_secret

User = get_user_model()


@override_settings(
    REST_FRAMEWORK={
        "DEFAULT_AUTHENTICATION_CLASSES": (
            "core.authentication.AuditJWTAuthentication",
        ),
        "DEFAULT_PERMISSION_CLASSES": ("rest_framework.permissions.IsAuthenticated",),
        "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",

        "DEFAULT_THROTTLE_CLASSES": (
            "rest_framework.throttling.UserRateThrottle",
        ),

        "DEFAULT_THROTTLE_RATES": {
            "analytics": "120/min",
            "login": "5/min",
            "user": "100/min",
            "otp": "5/min",
            "attendance": "10/min",
            "upload": "20/min",
            "copilot": "30/min",
            "export": "30/min",
        },        
    }
)

class TwoFactorApiTests(APITestCase):
    def setUp(self):
        cache.clear()
        company = Company.objects.create(name="2FA Co")
        self.user = User.objects.create_user(
            username="mfa-user",
            email="mfa@example.com",
            password="pass12345",
            company=company,
        )

    def _bearer_from_login(self):
        login = self.client.post(reverse("token_obtain_pair"), {"username": "mfa-user", "password": "pass12345"}, format="json")
        self.assertEqual(login.status_code, status.HTTP_200_OK)
        self.assertIn("access", login.data)
        return login.data["access"]

    def test_2fa_setup_verify_and_login_flow(self):
        access = self._bearer_from_login()
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")

        setup = self.client.post(reverse("auth-2fa-setup"), {}, format="json")
        self.assertEqual(setup.status_code, status.HTTP_200_OK)
        self.assertIn("qr_code_base64", setup.data)
        self.assertIn("otp_auth_url", setup.data)

        self.user.refresh_from_db()
        secret = decrypt_secret(self.user.otp_secret)
        self.assertTrue(secret)

        otp = current_totp_code(secret)
        verify = self.client.post(reverse("auth-2fa-verify"), {"otp_code": otp}, format="json")
        self.assertEqual(verify.status_code, status.HTTP_200_OK)

        self.user.refresh_from_db()
        self.assertTrue(self.user.is_2fa_enabled)
        self.assertEqual(len(self.user.backup_codes), 10)

        self.client.credentials()
        first_login = self.client.post(reverse("token_obtain_pair"), {"username": "mfa-user", "password": "pass12345"}, format="json")
        self.assertEqual(first_login.status_code, status.HTTP_200_OK)
        self.assertTrue(first_login.data["requires_2fa"])
        self.assertIn("temp_token", first_login.data)

        otp2 = current_totp_code(secret)
        second_login = self.client.post(
            reverse("token_obtain_pair_2fa"),
            {"temp_token": first_login.data["temp_token"], "otp_code": otp2},
            format="json",
        )
        self.assertEqual(second_login.status_code, status.HTTP_200_OK)
        self.assertIn("access", second_login.data)
        self.assertIn("refresh", second_login.data)

    def test_otp_verification_rate_limited(self):
        self.user.is_2fa_enabled = True
        self.user.save(update_fields=["is_2fa_enabled"])

        for _ in range(5):
            res = self.client.post(reverse("token_obtain_pair_2fa"), {"temp_token": "bad", "otp_code": "000000"}, format="json")
            self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

        limited = self.client.post(reverse("token_obtain_pair_2fa"), {"temp_token": "bad", "otp_code": "000000"}, format="json")
        self.assertEqual(limited.status_code, status.HTTP_429_TOO_MANY_REQUESTS)