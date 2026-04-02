import type { Content } from "../types/myRequests.types";

type RequestsHeroProps = {
  content: Content;
  requestsCount: number;
};

export function RequestsHero({ content, requestsCount }: RequestsHeroProps) {
  return (
    <section className="hero-panel leave-my-requests-hero">
      <div className="hero-panel__intro">
        <h1>{content.pageTitle}</h1>
        <p>{content.pageSubtitle}</p>
        <div className="hero-tags">
          <span className="pill">{content.tableTitle}</span>
          <span className="pill pill--accent">{requestsCount}</span>
        </div>
      </div>
      <div className="hero-panel__stats">
        {[
          {
            label: content.headers.status,
            value: content.statusLabels.pending,
          },
          {
            label: content.headers.status,
            value: content.statusLabels.approved,
          },
          {
            label: content.headers.status,
            value: content.statusLabels.rejected,
          },
        ].map((stat, index) => (
          <div key={`${stat.value}-${index}`} className="stat-card">
            <div className="stat-card__top">
              <span>{stat.label}</span>
              <span className="stat-card__change">{content.pageTitle}</span>
            </div>
            <strong>{stat.value}</strong>
            <div className="stat-card__spark" aria-hidden="true" />
          </div>
        ))}
      </div>
    </section>
  );
}