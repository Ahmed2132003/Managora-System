import { useMemo } from "react";
import { isForbiddenError } from "../../../../../shared/api/errors";
import { AccessDenied } from "../../../../../shared/ui/AccessDenied";
import { DashboardShell } from "../../../../../pages/DashboardShell";
import "../../../../../pages/hr/PayrollPeriodDetailsPage.css";
import { PayrollPeriodHeroPanel } from "../components/PayrollPeriodHeroPanel";
import { PayrollPeriodSearchPanel } from "../components/PayrollPeriodSearchPanel";
import { PayrollRunDetailsPanel } from "../components/PayrollRunDetailsPanel";
import { PayrollRunsTablePanel } from "../components/PayrollRunsTablePanel";
import { usePayrollPeriodDetailsData } from "../hooks/usePayrollPeriodDetailsData";
import { contentMap } from "../services/payrollPeriodDetails.content";

export function PayrollPeriodDetailsPage() {
  const {
    search,
    setSearch,
    selectedRun,
    setSelectedRun,
    hrName,
    runPayables,
    runsQuery,
    periodsQuery,
    runDetailsQuery,
    lockMutation,
    markPaidMutation,
    meQuery,
    filteredRuns,
    periodStatus,
    periodInfo,
    runSummary,
    payableTotal,
    managerName,
    handleMarkPaid,
    handleSavePng,
    handleLockPeriod,
  } = usePayrollPeriodDetailsData();

  const shellCopy = useMemo(
    () => ({
      en: { title: contentMap.en.title, subtitle: contentMap.en.subtitle },
      ar: { title: contentMap.ar.title, subtitle: contentMap.ar.subtitle },
    }),
    []
  );

  if (
    isForbiddenError(runsQuery.error) ||
    isForbiddenError(runDetailsQuery.error) ||
    isForbiddenError(periodsQuery.error)
  ) {
    return <AccessDenied />;
  }

  return (
    <DashboardShell copy={shellCopy} className="payroll-period-details-page">
      {({ language, isArabic }) => {
        const content = contentMap[language];

        return (
          <div className="payroll-period-details__content" dir={isArabic ? "rtl" : "ltr"}>
            <PayrollPeriodHeroPanel content={content} periodStatus={periodStatus} periodInfo={periodInfo} />

            <PayrollPeriodSearchPanel
              content={content}
              search={search}
              onSearchChange={setSearch}
              periodStatus={periodStatus}
              lockPending={lockMutation.isPending}
              onLockPeriod={handleLockPeriod}
            />

            <PayrollRunsTablePanel
              content={content}
              runsLoading={runsQuery.isLoading}
              filteredRuns={filteredRuns}
              runPayables={runPayables}
              onSelectRun={setSelectedRun}
            />

            <PayrollRunDetailsPanel
              content={content}
              selectedRun={selectedRun}
              runDetailsLoading={runDetailsQuery.isLoading}
              runDetails={runDetailsQuery.data}
              runSummary={runSummary}
              payableTotal={payableTotal}
              managerName={managerName}
              hrName={hrName}
              companyName={meQuery.data?.company.name ?? "-"}
              markPaidPending={markPaidMutation.isPending}
              onCloseDetails={() => setSelectedRun(null)}
              onMarkPaid={handleMarkPaid}
              onSavePng={handleSavePng}
            />
          </div>
        );
      }}
    </DashboardShell>
  );
}