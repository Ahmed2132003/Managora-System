import { formatCurrency, formatNumber, formatPercent } from "../../../shared/analytics/format";
import type { Content } from "../types/dashboard.types";

type DashboardMainContentProps = {
  content: Content;
  companyName: string;
  isArabic: boolean;
  searchTerm: string;
  searchResults: Array<{ label: string; description: string }>;
  data: any;
};

export function DashboardMainContent({ content, companyName, isArabic, searchTerm, searchResults, data }: DashboardMainContentProps) {
  return (
    <main className="dashboard-main">
      <section className="hero-panel">
        <div className="hero-panel__intro">
          <h1>{content.welcome}, {companyName}</h1>
          <p>{content.subtitle}</p>
          <div className="hero-tags">
            <span className="pill">{data.selectedRangeLabel}</span>
            <span className="pill pill--accent">{data.forecastSnapshot?.as_of_date ?? data.dateTo}</span>
            <label className="date-filter-pill">
              <span>{content.dateFromLabel}</span>
              <input type="date" value={data.dateFrom} max={data.dateTo} onChange={(event) => data.setDateFrom(event.target.value)} />
            </label>
            <label className="date-filter-pill">
              <span>{content.dateToLabel}</span>
              <input type="date" value={data.dateTo} min={data.dateFrom} onChange={(event) => data.setDateTo(event.target.value)} />
            </label>
          </div>
        </div>
        <div className="hero-panel__stats">
          {[
            { label: content.stats.revenue, value: formatCurrency(data.profitLossQuery.data?.income_total ?? null), change: data.selectedRangeLabel },
            { label: content.stats.expenses, value: formatCurrency(data.profitLossQuery.data?.expense_total ?? null), change: data.selectedRangeLabel },
            { label: content.stats.netProfit, value: formatCurrency(data.profitLossQuery.data?.net_profit ?? null), change: data.selectedRangeLabel },
          ].map((stat) => (
            <div key={stat.label} className="stat-card">
              <div className="stat-card__top"><span>{stat.label}</span><span className="stat-card__change">{stat.change}</span></div>
              <strong>{data.profitLossQuery.isLoading || data.cashLedgerQuery.isLoading ? content.loadingLabel : stat.value}</strong>
              <div className="stat-card__spark" aria-hidden="true" />
            </div>
          ))}
        </div>
      </section>

      <section className="panel panel--command-center panel--wide">
        <div className="panel__header"><div><h2>{content.commandCenterTitle}</h2><p>{content.commandCenterSubtitle}</p></div><span className="pill pill--accent">{content.generatedLabel}</span></div>
        <div className="command-center-grid">{data.commandCards.map((card: any) => <div key={card.label} className="command-center-card"><span>{card.label}</span><strong>{card.value}</strong></div>)}</div>
        <div className="executive-bars">{data.commandCards.map((card: any, index: number) => <div key={`cmd-${card.label}`} className="executive-bars__row"><span>{card.label}</span><div className="executive-bars__track"><span style={{ width: `${42 + (((index + 2) * 10) % 43)}%` }} /></div></div>)}</div>
      </section>

      {searchTerm.trim().length > 0 && (
        <section className="search-results" aria-live="polite">
          <div className="search-results__header"><div><h2>{content.searchResultsTitle}</h2><p>{content.searchResultsSubtitle}</p></div><span className="pill pill--accent">{searchResults.length}</span></div>
          {searchResults.length ? (
            <ul className="search-results__list">{searchResults.map((result, index) => <li key={`${result.label}-${index}`}><strong>{result.label}</strong><span>{result.description}</span></li>)}</ul>
          ) : (
            <div className="search-results__empty"><strong>{content.searchEmptyTitle}</strong><span>{content.searchEmptySubtitle}</span></div>
          )}
        </section>
      )}

      <section className="grid-panels">
        <div className="panel panel--insights">
          <div className="panel__header"><div><h2>{content.insightsTitle}</h2><p>{content.insightsSubtitle}</p></div><span className="pill pill--accent">Sync</span></div>
          <div className="bar-chart">{data.barValues.length ? data.barValues.map((item: any) => <span key={item.date} style={{ height: `${item.height}%` }} title={`${item.date}: ${formatCurrency(item.value.toString())}`} />) : <span className="bar-chart__empty">{data.kpisQuery.isLoading ? content.loadingLabel : content.searchEmptyTitle}</span>}</div>
        </div>

        <div className="panel panel--forecast panel--wide">
          <div className="panel__header"><div><h2>{content.forecastTitle}</h2><p>{content.forecastSubtitle}</p></div><span className="pill">{data.forecastSnapshot?.horizon_days ? `+${data.forecastSnapshot.horizon_days}d` : "-"}</span></div>
          <div className="forecast-grid">{data.forecastCards.length ? data.forecastCards.map((card: any) => <div key={card.label} className="forecast-card"><span>{card.label}</span><strong>{card.value}</strong></div>) : <div className="forecast-card"><span>{content.loadingLabel}</span><strong>-</strong></div>}</div>
          <div className="executive-bars">{data.forecastBars.map((bar: any) => <div key={bar.label} className="executive-bars__row"><span>{bar.label}</span><div className={`executive-bars__track executive-bars__track--${bar.tone}`}><span style={{ width: `${bar.width}%` }} /></div></div>)}</div>
        </div>

        <div className="panel panel--finance-mix panel--wide">
          <div className="panel__header"><div><h2>{content.financeMixTitle}</h2><p>{content.financeMixSubtitle}</p></div><span className="pill">{data.financeMixRows.length || 0}</span></div>
          <div className="finance-mix-chart">{data.financeMixBars.length ? data.financeMixBars.map((row: any) => <div key={row.date} className="finance-mix-chart__row" title={`${row.date} • ${content.stats.revenue}: ${formatCurrency(row.revenue.toString())} • ${content.stats.expenses}: ${formatCurrency(row.expenses.toString())}`}><div className="finance-mix-chart__bars"><span style={{ height: `${row.revenueHeight}%` }} className="finance-mix-chart__bar finance-mix-chart__bar--revenue" /><span style={{ height: `${row.expenseHeight}%` }} className="finance-mix-chart__bar finance-mix-chart__bar--expense" /></div><small>{new Date(row.date).toLocaleDateString(isArabic ? "ar" : "en", { month: "short", day: "numeric" })}</small></div>) : <div className="search-results__empty"><strong>{content.noDataLabel}</strong><span>{content.financeMixSubtitle}</span></div>}</div>
          <div className="finance-mix-totals"><span>{content.stats.revenue}: <strong>{formatCurrency(data.totalRevenue.toString())}</strong></span><span>{content.stats.expenses}: <strong>{formatCurrency(data.totalExpenses.toString())}</strong></span><span>{content.stats.netProfit}: <strong>{formatCurrency(data.totalNet.toString())}</strong></span></div>
        </div>

        <div className="panel panel--hr-health panel--wide">
          <div className="panel__header"><div><h2>{content.hrHealthTitle}</h2><p>{content.hrHealthSubtitle}</p></div><span className="pill pill--accent">{formatNumber(data.hrMetrics.availabilityScore.toString())}%</span></div>
          <div className="hr-health-layout"><div className="gauge-wrap"><div className="gauge" style={data.gaugeStyle}><div className="gauge__center"><strong>{formatNumber(data.hrMetrics.availabilityScore.toString())}%</strong><span>{isArabic ? "جاهزية الفريق" : "Team readiness"}</span></div></div></div><div className="hr-health-metrics"><div><span>{content.absenceLabel}</span><strong>{data.hrAbsenceAverage === null ? "-" : `${formatNumber(data.hrAbsenceAverage.toFixed(1))} ${isArabic ? "يوم" : "days"}`}</strong></div><div><span>{content.latenessLabel}</span><strong>{formatPercent(data.hrMetrics.latenessAvg?.toString() ?? null)}</strong></div><div><span>{content.overtimeLabel}</span><strong>{formatNumber(data.hrMetrics.overtimeTotal.toString())}</strong></div></div></div>
        </div>

        <div className="panel panel--signals panel--wide">
          <div className="panel__header"><div><h2>{content.signalsTitle}</h2><p>{content.signalsSubtitle}</p></div><span className="pill">{data.alertsQuery.data?.length ?? 0}</span></div>
          <div className="signal-bars">{data.riskDistribution.map((item: any) => <div key={item.label} className="signal-bar-item"><div className="signal-bar-item__meta"><span>{item.label}</span><strong>{item.value}</strong></div><div className="signal-bar-track"><span style={{ width: `${Math.max(item.ratio, item.value ? 8 : 0)}%` }} /></div></div>)}</div>
        </div>

        <div className="panel panel--activity panel--wide">
          <div className="panel__header"><div><h2>{content.activityTitle}</h2><p>{content.activitySubtitle}</p></div></div>
          <div className="activity-list">{data.activityItems.length ? data.activityItems.map((item: any) => <div key={item.id} className="activity-item"><div><strong>{item.title}</strong><span>{new Date(item.event_date).toLocaleDateString(isArabic ? "ar" : "en")}</span></div><span className="tag">{item.severity}</span></div>) : <div className="activity-item"><div><strong>{content.searchEmptyTitle}</strong><span>{content.searchEmptySubtitle}</span></div><span className="tag">-</span></div>}</div>
        </div>
      </section>
    </main>
  );
}