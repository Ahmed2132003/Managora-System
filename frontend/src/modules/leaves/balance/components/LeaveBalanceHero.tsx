import type { LeaveBalancePageContent } from "../types/leaveBalance.types";
import { formatDays } from "../utils/leaveBalance.utils";

type Totals = { allocated: number; used: number; remaining: number };

type LeaveBalanceHeroProps = {
  content: LeaveBalancePageContent;
  totals: Totals;
  isLoading: boolean;
};

export function LeaveBalanceHero({ content, totals, isLoading }: LeaveBalanceHeroProps) {
  return (
    <section className="hero-panel leave-balance-hero">
      <div className="hero-panel__intro">
        <h1>{content.pageTitle}</h1>
        <p>{content.pageSubtitle}</p>
        <div className="hero-tags">
          <span className="pill">{content.summaryTitle}</span>
          <span className="pill pill--accent">
            {isLoading ? content.loadingLabel : formatDays(totals.remaining)}
          </span>
        </div>
      </div>
      <div className="hero-panel__stats">
        {[
          { label: content.totals.remaining, value: formatDays(totals.remaining) },
          { label: content.totals.used, value: formatDays(totals.used) },
          { label: content.totals.allocated, value: formatDays(totals.allocated) },
        ].map((stat) => (
          <div key={stat.label} className="stat-card">
            <div className="stat-card__top">
              <span>{stat.label}</span>
              <span className="stat-card__change">{content.summaryTitle}</span>
            </div>
            <strong>{stat.value}</strong>
            <div className="stat-card__spark" aria-hidden="true" />
          </div>
        ))}
      </div>
    </section>
  );
}