from django.urls import include, path
from rest_framework.routers import DefaultRouter

from accounting.views import (
    AccountViewSet,
    ARAgingReportView,
    AlertsView,
    BalanceSheetView,
    CustomerViewSet,
    CatalogItemViewSet,
    StockTransactionViewSet,
    ExpenseViewSet,
    GeneralLedgerView,
    InvoiceViewSet,
    JournalEntryViewSet,    
    PaymentViewSet,
    ProfitLossView,
    TrialBalanceView,
)

router = DefaultRouter()
router.register("accounting/accounts", AccountViewSet, basename="accounting-account")
router.register("customers", CustomerViewSet, basename="customer")
router.register("invoices", InvoiceViewSet, basename="invoice")
router.register(
    "accounting/journal-entries", JournalEntryViewSet, basename="journal-entry"
)
router.register("expenses", ExpenseViewSet, basename="expense")
router.register("payments", PaymentViewSet, basename="payment")
router.register("catalog-items", CatalogItemViewSet, basename="catalog-item")
router.register("inventory/transactions", StockTransactionViewSet, basename="stock-transaction")

urlpatterns = [
    path("", include(router.urls)),
    path("alerts/", AlertsView.as_view(), name="alerts-list"),
    path("reports/ar-aging/", ARAgingReportView.as_view(), name="report-ar-aging"),
    path("reports/trial-balance/", TrialBalanceView.as_view(), name="report-trial-balance"),    
    path("reports/general-ledger/", GeneralLedgerView.as_view(), name="report-general-ledger"),
    path("reports/pnl/", ProfitLossView.as_view(), name="report-pnl"),
    path("reports/balance-sheet/", BalanceSheetView.as_view(), name="report-balance-sheet"),
]