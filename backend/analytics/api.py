from __future__ import annotations

from datetime import timedelta
from decimal import Decimal

from django.conf import settings
from django.db.models import Avg, Sum
from django.http import HttpResponse
from django.utils import timezone
from django.utils.dateparse import parse_date
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.renderers import BaseRenderer, JSONRenderer
from rest_framework.views import APIView

from analytics.forecast import build_cash_forecast
from analytics.models import KPIContributionDaily, KPIDefinition, KPIFactDaily
from analytics.serializers import CashForecastSnapshotSerializer
from analytics.throttles import AnalyticsRateThrottle
from core.audit import get_audit_context
from core.models import ExportLog
from core.permissions import HasAnyPermission, RoleBasedPermission, user_has_permission
from core.throttles import ExportRateThrottle
from core.services.cache_utils import safe_cache_get, safe_cache_set

SUMMARY_KEYS = {
    "revenue_total": "revenue_daily",
    "expenses_total": "expenses_daily",
    "absence_rate_avg": "absence_rate_daily",
    "lateness_rate_avg": "lateness_rate_daily",
    "cash_balance_latest": "cash_balance_daily",
}



def _cache_ttl() -> int:
    return int(getattr(settings, "CACHE_TTL", 300))


class CSVRenderer(BaseRenderer):
    media_type = "text/csv"
    format = "csv"
    charset = "utf-8"

    def render(self, data, accepted_media_type=None, renderer_context=None):
        if data is None:
            return b""
        if isinstance(data, bytes):
            return data
        if isinstance(data, str):
            return data.encode(self.charset)
        return str(data).encode(self.charset)

DEFAULT_KEYS_BY_CATEGORY = {
    KPIDefinition.Category.HR: {
        "absence_rate_daily",
        "lateness_rate_daily",
        "overtime_hours_daily",
        "absence_by_department_daily",
        "lateness_by_department_daily",
        "overtime_hours_by_department_daily",
    },
    KPIDefinition.Category.FINANCE: {
        "revenue_daily",
        "expenses_daily",
        "ar_balance_daily",
        "ap_balance_daily",
    },
    KPIDefinition.Category.CASH: {
        "cash_balance_daily",
        "cash_inflow_daily",
        "cash_outflow_daily",
    },
}


def _serialize_decimal(value: Decimal | None) -> str | None:
    if value is None:
        return None
    return format(value.quantize(Decimal("0.000001")), "f")


class AnalyticsAccessMixin:
    permission_classes = [IsAuthenticated, RoleBasedPermission]
    permission_scopes = ["hr", "finance", "manager"]

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
            categories.update(
                {KPIDefinition.Category.FINANCE, KPIDefinition.Category.CASH}
            )
        if user_has_permission(user, "analytics.view_hr"):
            categories.add(KPIDefinition.Category.HR)
        return categories

    def _allowed_keys(self):
        categories = self._allowed_categories(self.request.user)
        if categories is None:
            return None

        # When categories is an empty set (shouldn't happen with the permission gate),
        # treat it as "no restriction" to avoid accidentally hiding all data.
        if not categories:
            return None

        qs = KPIDefinition.objects.filter(
            company=self.request.user.company,
            category__in=categories,
            is_active=True,
        ).values_list("key", flat=True)

        # If KPI definitions are not seeded yet, fall back to a safe default
        # allow-list per category so dashboards still show data.
        if not qs.exists():
            fallback: set[str] = set()
            for cat in categories:
                fallback.update(DEFAULT_KEYS_BY_CATEGORY.get(cat, set()))
            return fallback or None

        return set(qs)



class AnalyticsSummaryView(AnalyticsAccessMixin, APIView):
    throttle_classes = [AnalyticsRateThrottle]    
    @extend_schema(
        tags=["Analytics"],
        summary="Get summary cards",
    )
    def get(self, request):
        range_param = request.query_params.get("range", "30d")
        days = self._parse_range_days(range_param)
        end_date = timezone.localdate()
        start_date = end_date - timedelta(days=days - 1)

        company = request.user.company
        allowed_keys = self._allowed_keys()
        allowed_cache_key = "all" if allowed_keys is None else ",".join(sorted(allowed_keys))
        cache_key = f"analytics:summary:{company.id}:{range_param}:{allowed_cache_key}"
        cached = safe_cache_get(cache_key)        
        if cached:
            return Response(cached)
        base_queryset = KPIFactDaily.objects.filter(
            company=company,
            date__gte=start_date,
            date__lte=end_date,
        )
        if allowed_keys is not None:
            base_queryset = base_queryset.filter(kpi_key__in=allowed_keys)
            
        revenue_total = self._sum_for(base_queryset, SUMMARY_KEYS["revenue_total"])
        expenses_total = self._sum_for(base_queryset, SUMMARY_KEYS["expenses_total"])
        absence_rate_avg = self._avg_for(
            base_queryset, SUMMARY_KEYS["absence_rate_avg"]
        )
        lateness_rate_avg = self._avg_for(
            base_queryset, SUMMARY_KEYS["lateness_rate_avg"]
        )
        cash_balance_latest = self._latest_value(company, SUMMARY_KEYS["cash_balance_latest"])

        net_profit_est = (
            revenue_total - expenses_total
            if revenue_total is not None and expenses_total is not None
            else None
        )

        payload = {
            "revenue_total": _serialize_decimal(revenue_total),
            "expenses_total": _serialize_decimal(expenses_total),
            "net_profit_est": _serialize_decimal(net_profit_est),
            "absence_rate_avg": _serialize_decimal(absence_rate_avg),
            "lateness_rate_avg": _serialize_decimal(lateness_rate_avg),
            "cash_balance_latest": _serialize_decimal(cash_balance_latest),
        }
        safe_cache_set(cache_key, payload, timeout=_cache_ttl())        
        return Response(payload)
    
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

    @staticmethod
    def _sum_for(queryset, key: str) -> Decimal | None:
        if not queryset.filter(kpi_key=key).exists():
            return None
        return queryset.filter(kpi_key=key).aggregate(total=Sum("value"))["total"]

    @staticmethod
    def _avg_for(queryset, key: str) -> Decimal | None:
        if not queryset.filter(kpi_key=key).exists():
            return None
        return queryset.filter(kpi_key=key).aggregate(avg=Avg("value"))["avg"]

    def _latest_value(self, company, key: str) -> Decimal | None:
        allowed_keys = self._allowed_keys()
        queryset = KPIFactDaily.objects.filter(company=company, kpi_key=key)
        if allowed_keys is not None:
            queryset = queryset.filter(kpi_key__in=allowed_keys)
        latest = queryset.order_by("-date").first()
        return latest.value if latest else None


class AnalyticsKPIView(AnalyticsAccessMixin, APIView):
    throttle_classes = [AnalyticsRateThrottle]    
    @extend_schema(
        tags=["Analytics"],
        summary="Get KPI timeseries",
    )
    def get(self, request):
        keys_param = request.query_params.get("keys", "")
        start_date = parse_date(request.query_params.get("start"))
        end_date = parse_date(request.query_params.get("end"))

        if not keys_param or not start_date or not end_date:
            return Response(
                {"detail": "keys, start, and end are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        keys = [key.strip() for key in keys_param.split(",") if key.strip()]
        if not keys:
            return Response(
                {"detail": "At least one key is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        allowed_keys = self._allowed_keys()
        if allowed_keys is not None:
            keys = [key for key in keys if key in allowed_keys]

        cache_key = (
            f"analytics:kpi:{request.user.company_id}:{','.join(keys)}:"
            f"{start_date.isoformat()}:{end_date.isoformat()}"
        )
        cached = safe_cache_get(cache_key)        
        if cached:
            return Response(cached)

        facts = KPIFactDaily.objects.filter(
            company=request.user.company,
            date__gte=start_date,
            date__lte=end_date,            
            kpi_key__in=keys,
        ).order_by("date")

        points_by_key = {key: [] for key in keys}
        for fact in facts:
            points_by_key[fact.kpi_key].append(
                {"date": fact.date.isoformat(), "value": _serialize_decimal(fact.value)}
            )

        payload = [{"key": key, "points": points_by_key.get(key, [])} for key in keys]
        safe_cache_set(cache_key, payload, timeout=_cache_ttl())        
        return Response(payload)

class AnalyticsCompareView(AnalyticsAccessMixin, APIView):
    throttle_classes = [AnalyticsRateThrottle]    
    @extend_schema(
        tags=["Analytics"],
        summary="Compare KPI over period",
    )
    def get(self, request):
        kpi_key = request.query_params.get("kpi")
        period = request.query_params.get("period", "this_month")
        if not kpi_key:
            return Response(
                {"detail": "kpi is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )


        allowed_keys = self._allowed_keys()
        if allowed_keys is not None and kpi_key not in allowed_keys:
            return Response(
                {"detail": "KPI not available."},
                status=status.HTTP_403_FORBIDDEN,
            )

        cache_key = f"analytics:compare:{request.user.company_id}:{kpi_key}:{period}"
        cached = safe_cache_get(cache_key)        
        if cached:
            return Response(cached)

        current_start, current_end, previous_start, previous_end = self._period_bounds(
            period
        )
        
        current_total = self._sum_for_period(kpi_key, current_start, current_end)
        previous_total = self._sum_for_period(kpi_key, previous_start, previous_end)
        delta_amount = current_total - previous_total
        delta_percent = (
            (delta_amount / previous_total * Decimal("100"))
            if previous_total != Decimal("0")
            else None
        )

        payload = {
            "current_total": _serialize_decimal(current_total),
            "previous_total": _serialize_decimal(previous_total),
            "delta_amount": _serialize_decimal(delta_amount),
            "delta_percent": _serialize_decimal(delta_percent),
        }
        safe_cache_set(cache_key, payload, timeout=_cache_ttl())        
        return Response(payload)
    
    def _sum_for_period(self, kpi_key: str, start, end) -> Decimal:
        total = (
            KPIFactDaily.objects.filter(
                company=self.request.user.company,
                kpi_key=kpi_key,
                date__gte=start,
                date__lte=end,
            ).aggregate(total=Sum("value"))["total"]
            or Decimal("0")
        )
        return total

    @staticmethod
    def _period_bounds(period: str):
        today = timezone.localdate()
        if period == "this_week":
            current_end = today
            current_start = today - timedelta(days=6)
        else:
            current_start = today.replace(day=1)
            current_end = today
        days = (current_end - current_start).days + 1
        previous_end = current_start - timedelta(days=1)
        previous_start = previous_end - timedelta(days=days - 1)
        return current_start, current_end, previous_start, previous_end


class CashForecastView(APIView):
    permission_classes = [IsAuthenticated, RoleBasedPermission]
    permission_scope = "finance"
    throttle_classes = [AnalyticsRateThrottle]
    
    def get_permissions(self):
        return [HasAnyPermission(["analytics.view_ceo", "analytics.view_finance"])]

    @extend_schema(
        tags=["Analytics"],
        summary="Get cash forecast snapshots",
    )
    def get(self, request):
        as_of_param = request.query_params.get("as_of")
        as_of_date = parse_date(as_of_param) if as_of_param else None
        if as_of_param and not as_of_date:
            return Response(
                {"detail": "Invalid as_of date format."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        snapshots = build_cash_forecast(request.user.company_id, as_of_date)
        serializer = CashForecastSnapshotSerializer(snapshots, many=True)
        return Response(serializer.data)

class AnalyticsBreakdownView(AnalyticsAccessMixin, APIView):
    throttle_classes = [AnalyticsRateThrottle]    
    @extend_schema(
        tags=["Analytics"],
        summary="Get KPI breakdown",
    )
    def get(self, request):
        kpi_key = request.query_params.get("kpi")
        dimension = request.query_params.get("dimension")
        target_date = parse_date(request.query_params.get("date"))
        limit = int(request.query_params.get("limit", 10))

        if not kpi_key or not dimension or not target_date:
            return Response(
                {"detail": "kpi, dimension, and date are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        allowed_keys = self._allowed_keys()
        if allowed_keys is not None and kpi_key not in allowed_keys:
            return Response(
                {"detail": "KPI not available."},
                status=status.HTTP_403_FORBIDDEN,
            )

        contributions = (
            KPIContributionDaily.objects.filter(
                company=request.user.company,
                date=target_date,
                kpi_key=kpi_key,
                dimension=dimension,
            )
            .order_by("-amount")
            .values("dimension_id", "amount")[:limit]
        )

        return Response(
            {
                "kpi": kpi_key,
                "dimension": dimension,
                "date": target_date.isoformat(),
                "items": [
                    {
                        "dimension_id": item["dimension_id"],
                        "amount": _serialize_decimal(item["amount"]),
                    }
                    for item in contributions
                ],
            }
        )


class AnalyticsExportView(AnalyticsAccessMixin, APIView):
    throttle_classes = [AnalyticsRateThrottle, ExportRateThrottle]
    renderer_classes = [JSONRenderer, CSVRenderer]
    @extend_schema(
        tags=["Analytics"],
        summary="Export KPI data",
    )
    def get(self, request):
        if not user_has_permission(request.user, "export.analytics"):
            return Response(
                {"detail": "You do not have permission to export data."},
                status=status.HTTP_403_FORBIDDEN,
            )
        kpi_key = request.query_params.get("kpi")
        start_date = parse_date(request.query_params.get("start"))
        end_date = parse_date(request.query_params.get("end"))
        export_format = request.query_params.get("format", "json").lower()
        
        if not kpi_key or not start_date or not end_date:
            return Response(
                {"detail": "kpi, start, and end are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        allowed_keys = self._allowed_keys()
        if allowed_keys is not None and kpi_key not in allowed_keys:
            return Response(
                {"detail": "KPI not available."},
                status=status.HTTP_403_FORBIDDEN,
            )

        facts = KPIFactDaily.objects.filter(
            company=request.user.company,
            kpi_key=kpi_key,
            date__gte=start_date,
            date__lte=end_date,
        ).order_by("date")

        max_rows = 5000
        facts = facts[:max_rows]
        points = [
            {"date": fact.date.isoformat(), "value": _serialize_decimal(fact.value)}
            for fact in facts
        ]

        audit_context = get_audit_context()
        ExportLog.objects.create(
            company=request.user.company,
            actor=request.user,
            export_type="analytics.kpi",
            filters={
                "kpi": kpi_key,
                "start": start_date.isoformat(),
                "end": end_date.isoformat(),
                "format": export_format,
            },
            row_count=len(points),
            ip_address=audit_context.ip_address if audit_context else None,
            user_agent=audit_context.user_agent if audit_context else None,
        )

        if export_format == "csv":
            content_lines = ["date,value"] + [
                f"{point['date']},{point['value']}" for point in points                
            ]
            content = "\n".join(content_lines)
            response = HttpResponse(content, content_type="text/csv")
            response["Content-Disposition"] = (
                f"attachment; filename={kpi_key}-{start_date}-{end_date}.csv"
            )
            return response

        return Response({"key": kpi_key, "points": points})