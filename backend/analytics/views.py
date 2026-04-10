from datetime import timedelta

from django.db import transaction
from django.utils import timezone
from django.utils.dateparse import parse_date
from drf_spectacular.utils import extend_schema
from rest_framework import status
from django.shortcuts import get_object_or_404
from rest_framework.generics import ListAPIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from analytics.models import AlertEvent, KPIDefinition, KPIFactDaily
from analytics.serializers import (
    AlertAckCreateSerializer,
    AlertEventDetailSerializer,
    AlertEventListSerializer,
    AnalyticsRebuildSerializer,
    KPIFactDailySerializer,
)
from analytics.tasks import build_analytics_range
from analytics.throttles import AnalyticsRateThrottle
from core.permissions import HasAnyPermission, HasPermission, RoleBasedPermission, user_has_permission
from core.permissions import HasAnyPermission, HasPermission, user_has_permission


class KPIFactDailyListView(ListAPIView):
    permission_classes = [IsAuthenticated, RoleBasedPermission]
    permission_scopes = ["hr", "finance", "manager"]    
    permission_classes = []
    throttle_classes = [AnalyticsRateThrottle]
    
    @extend_schema(
        tags=["Analytics"],
        summary="List KPI facts",
        responses={200: KPIFactDailySerializer(many=True)},
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)

    def get_permissions(self):
        return [
            HasAnyPermission(
                [
                    "analytics.view_ceo",
                    "analytics.view_finance",
                    "analytics.view_hr",
                ]
            )
        ]

    def _allowed_categories(self, user):
        if user_has_permission(user, "analytics.view_ceo"):
            return None

        categories = set()
        if user_has_permission(user, "analytics.view_finance"):
            categories.update({KPIDefinition.Category.FINANCE, KPIDefinition.Category.CASH})
        if user_has_permission(user, "analytics.view_hr"):
            categories.add(KPIDefinition.Category.HR)
        return categories

    def get_queryset(self):
        company = self.request.user.company
        queryset = KPIFactDaily.objects.filter(company=company)

        # Support both legacy params (kpi_key/start_date/end_date)
        # and the frontend analytics dashboard params (keys/start/end).
        keys_param = self.request.query_params.get("keys")
        kpi_key = self.request.query_params.get("kpi_key")

        if keys_param:
            keys = [k.strip() for k in keys_param.split(",") if k.strip()]
            if keys:
                queryset = queryset.filter(kpi_key__in=keys)
        elif kpi_key:
            queryset = queryset.filter(kpi_key=kpi_key)

        start_date = parse_date(
            self.request.query_params.get("start_date")
            or self.request.query_params.get("start")
            or ""
        )
        end_date = parse_date(
            self.request.query_params.get("end_date")
            or self.request.query_params.get("end")
            or ""
        )
        if start_date:
            queryset = queryset.filter(date__gte=start_date)
        if end_date:
            queryset = queryset.filter(date__lte=end_date)

        allowed_categories = self._allowed_categories(self.request.user)
        if allowed_categories:
            allowed_keys_qs = KPIDefinition.objects.filter(
                company=company,
                category__in=allowed_categories,
                is_active=True,
            ).values_list("key", flat=True)

            # If KPI definitions haven't been seeded yet, don't hide facts.
            # (This keeps dashboards usable while setup/seed runs.)
            if allowed_keys_qs.exists():
                queryset = queryset.filter(kpi_key__in=allowed_keys_qs)

        return queryset.order_by("date", "kpi_key")


class AnalyticsRebuildView(APIView):
    permission_classes = [IsAuthenticated, RoleBasedPermission]
    permission_scope = "manager"    
    throttle_classes = [AnalyticsRateThrottle]
    
    @extend_schema(
        tags=["Analytics"],
        summary="Rebuild analytics KPIs for a date range",
        request=AnalyticsRebuildSerializer,
        responses={200: AnalyticsRebuildSerializer},
    )
    def post(self, request, *args, **kwargs):
        serializer = AnalyticsRebuildSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        payload = serializer.validated_data
        result = build_analytics_range(
            request.user.company_id,
            payload["start_date"],
            payload["end_date"],
        )
        return Response(
            {
                "status": result["status"],
                "start_date": payload["start_date"],
                "end_date": payload["end_date"],
            },
            status=status.HTTP_200_OK,
        )

    def get_permissions(self):
        return [HasPermission("analytics.manage_rebuild")]


class AlertEventListView(APIView):
    permission_classes = [IsAuthenticated, RoleBasedPermission]
    permission_scope = "finance"
    
    throttle_classes = [AnalyticsRateThrottle]
    @extend_schema(
        tags=["Analytics"],
        summary="List alerts",
        responses={200: AlertEventListSerializer(many=True)},
    )
    def get(self, request, *args, **kwargs):
        return Response(
            AlertEventListSerializer(self._get_queryset(), many=True).data,
            status=status.HTTP_200_OK,
        )

    def get_permissions(self):
        return [HasPermission("analytics.alerts.view")]

    def _get_queryset(self):
        range_param = self.request.query_params.get("range")
        queryset = AlertEvent.objects.filter(company=self.request.user.company)
        if range_param:
            days = self._parse_range_days(range_param)
            end_date = timezone.localdate()
            start_date = end_date - timedelta(days=days - 1)
            queryset = queryset.filter(
                event_date__gte=start_date,
                event_date__lte=end_date,
            )        
        status_param = self.request.query_params.get("status")
        if status_param:
            queryset = queryset.filter(status=status_param)
        return queryset.order_by("-event_date", "-created_at")

    @staticmethod
    def _parse_range_days(range_param: str) -> int:
        if not range_param:
            return 30
        range_param = range_param.strip().lower()
        if range_param.endswith("d"):
            value = range_param[:-1]
            if value.isdigit():
                return max(int(value), 1)
        return 30


class AlertEventDetailView(APIView):
    permission_classes = [IsAuthenticated, RoleBasedPermission]
    permission_scope = "finance"
    
    throttle_classes = [AnalyticsRateThrottle]
    @extend_schema(
        tags=["Analytics"],
        summary="Get alert details",
        responses={200: AlertEventDetailSerializer},
    )
    def get(self, request, pk, *args, **kwargs):
        event = self._get_event(pk)
        return Response(
            AlertEventDetailSerializer(event).data,
            status=status.HTTP_200_OK,
        )

    def get_permissions(self):
        return [HasPermission("analytics.alerts.view")]

    def _get_event(self, pk):
        return get_object_or_404(
            AlertEvent, company=self.request.user.company, pk=pk
        )


class AlertEventAcknowledgeView(APIView):
    permission_classes = [IsAuthenticated, RoleBasedPermission]
    permission_scope = "finance"
    
    throttle_classes = [AnalyticsRateThrottle]
    @extend_schema(
        tags=["Analytics"],
        summary="Acknowledge alert",
        request=AlertAckCreateSerializer,
        responses={200: AlertEventDetailSerializer},
    )
    def post(self, request, pk, *args, **kwargs):
        serializer = AlertAckCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        with transaction.atomic():
            event = get_object_or_404(
                AlertEvent.objects.select_for_update(),
                company=request.user.company,
                pk=pk,
            )
            if event.status == AlertEvent.Status.RESOLVED:
                return Response(
                    {"detail": "Resolved alerts cannot be acknowledged."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            event.refresh_from_db()
            event.acknowledgements.create(
                acked_by=request.user,
                note=serializer.validated_data.get("note", ""),
            )
            event.status = AlertEvent.Status.ACKNOWLEDGED
            event.save(update_fields=["status"])
        return Response(
            AlertEventDetailSerializer(event).data,
            status=status.HTTP_200_OK,
        )

    def get_permissions(self):
        return [HasPermission("analytics.alerts.manage")]


class AlertEventResolveView(APIView):
    permission_classes = [IsAuthenticated, RoleBasedPermission]
    permission_scope = "finance"
    
    throttle_classes = [AnalyticsRateThrottle]
    @extend_schema(
        tags=["Analytics"],
        summary="Resolve alert",
        responses={200: AlertEventDetailSerializer},
    )
    def post(self, request, pk, *args, **kwargs):
        event = get_object_or_404(
            AlertEvent, company=request.user.company, pk=pk
        )
        event.status = AlertEvent.Status.RESOLVED
        event.save(update_fields=["status"])
        return Response(
            AlertEventDetailSerializer(event).data,
            status=status.HTTP_200_OK,
        )

    def get_permissions(self):
        return [HasPermission("analytics.alerts.manage")]