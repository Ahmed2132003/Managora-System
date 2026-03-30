from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from core.api_views.base import ThrottledAPIView
from core.serializers.auth import TwoFALoginVerifySerializer
from core.throttles import OTPThrottle
from core.serializers.two_factor import (
    TwoFABackupCodesSerializer,
    TwoFADisableSerializer,
    TwoFASetupSerializer,
    TwoFAVerifyActivationSerializer,
)


@extend_schema(tags=["Auth"], summary="Verify login 2FA challenge")
class TwoFALoginVerifyView(ThrottledAPIView):
    permission_classes = [AllowAny]
    throttle_classes = [OTPThrottle]

    def post(self, request):
        serializer = TwoFALoginVerifySerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        return Response(serializer.validated_data, status=status.HTTP_200_OK)

@extend_schema(tags=["Auth"], summary="Setup 2FA and return OTP auth URL + QR code")
class TwoFASetupView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = TwoFASetupSerializer(data={}, context={"request": request})
        serializer.is_valid(raise_exception=True)
        payload = serializer.save()
        return Response(payload, status=status.HTTP_200_OK)



@extend_schema(tags=["Auth"], summary="Verify and activate 2FA")
class TwoFAVerifyView(ThrottledAPIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [OTPThrottle]

    def post(self, request):
        serializer = TwoFAVerifyActivationSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"enabled": True}, status=status.HTTP_200_OK)
    

@extend_schema(tags=["Auth"], summary="Disable 2FA")
class TwoFADisableView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = TwoFADisableSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"enabled": False}, status=status.HTTP_200_OK)


@extend_schema(tags=["Auth"], summary="Regenerate 2FA backup codes")
class TwoFABackupCodesView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = TwoFABackupCodesSerializer(data={}, context={"request": request})
        serializer.is_valid(raise_exception=True)
        payload = serializer.save()
        return Response(payload, status=status.HTTP_200_OK)
