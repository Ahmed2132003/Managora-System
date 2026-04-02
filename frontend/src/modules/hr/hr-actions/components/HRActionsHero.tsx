import type { HRActionsContent } from "../types/hrActions.types";

type HRActionsHeroProps = {
  content: HRActionsContent;
  actionsCount: number;
  isLoading: boolean;
  stats: {
    total: number;
    warnings: number;
    deductions: number;
  };
};

export function HRActionsHero({ content, actionsCount, isLoading, stats }: HRActionsHeroProps) {
  return (
    <section className="hero-panel hr-actions-hero">
      <div className="hr-actions-hero__header">
        <div className="hero-panel__intro">
          <h1>{content.pageTitle}</h1>
          <p>{content.pageSubtitle}</p>
        </div>
        <div className="hero-tags">
          <span className="pill">{content.heroTag}</span>
          <span className="pill pill--accent">{actionsCount}</span>
        </div>
      </div>
      <div className="hero-panel__stats">
        {[
          { label: content.stats.total, value: stats.total },
          { label: content.stats.warnings, value: stats.warnings },
          { label: content.stats.deductions, value: stats.deductions },
          { label: content.stats.period, value: content.heroTag },
        ].map((stat) => (
          <div key={stat.label} className="stat-card">
            <div className="stat-card__top">
              <span>{stat.label}</span>
            </div>
            <strong>{isLoading ? "-" : stat.value}</strong>
            <div className="stat-card__spark" aria-hidden="true" />
          </div>
        ))}
      </div>
    </section>
  );
}