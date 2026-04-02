import type { PoliciesContent, PoliciesStats } from "../types/policies.types";

type Props = {
  content: PoliciesContent;
  stats: PoliciesStats;
};

export function PoliciesHeroSection({ content, stats }: Props) {
  return (
    <section className="hero-panel policies-hero">
      <div className="hero-panel__intro">
        <h1>{content.pageTitle}</h1>
        <p>{content.pageSubtitle}</p>
        <div className="hero-tags">
          <span className="pill">{content.overviewLabel}</span>
          <span className="pill pill--accent">{stats.total}</span>
        </div>
      </div>
      <div className="hero-panel__stats">
        {[
          { label: content.stats.total, value: stats.total },
          { label: content.stats.active, value: stats.active },
          { label: content.stats.inactive, value: stats.inactive },
          { label: content.stats.templates, value: stats.templates },
        ].map((stat) => (
          <div key={stat.label} className="stat-card">
            <div className="stat-card__top">
              <span>{stat.label}</span>
              <span className="stat-card__change">{content.overviewLabel}</span>
            </div>
            <strong>{stat.value}</strong>
            <div className="stat-card__spark" />
          </div>
        ))}
      </div>
    </section>
  );
}