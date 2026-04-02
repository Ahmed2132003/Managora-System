import type { Content, LeaveInboxStats } from "../types/leaveInbox.types";

type LeaveInboxHeroProps = {
  content: Content;
  stats: LeaveInboxStats;
};

export function LeaveInboxHero({ content, stats }: LeaveInboxHeroProps) {
  const heroStats = [
    { label: content.stats.pending, value: stats.totalRequests },
    { label: content.stats.totalDays, value: stats.totalDays },
    { label: content.stats.averageDays, value: stats.averageDays.toFixed(1) },
    { label: content.stats.employees, value: stats.employees },
  ];

  return (
    <section className="hero-panel leave-inbox-hero">
      <div className="hero-panel__intro">
        <h1>{content.pageTitle}</h1>
        <p>{content.pageSubtitle}</p>
        <div className="hero-tags">
          <span className="pill">{content.overviewLabel}</span>
          <span className="pill pill--accent">{stats.totalRequests}</span>
        </div>
      </div>
      <div className="hero-panel__stats">
        {heroStats.map((stat) => (
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