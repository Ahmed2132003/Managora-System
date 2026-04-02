import type { JobTitlesContent } from "../types/jobTitles.types";

type JobTitlesHeroSectionProps = {
  content: JobTitlesContent;
  isLoading: boolean;
  stats: {
    total: number;
    active: number;
    inactive: number;
  };
  onAdd: () => void;
};

export function JobTitlesHeroSection({ content, isLoading, stats, onAdd }: JobTitlesHeroSectionProps) {
  return (
    <section className="hero-panel job-titles-hero">
      <div className="job-titles-hero__header">
        <div className="hero-panel__intro">
          <h1>{content.pageTitle}</h1>
          <p>{content.pageSubtitle}</p>
        </div>
        <button type="button" className="primary-button" onClick={onAdd}>
          {content.addJobTitle}
        </button>
      </div>
      <div className="hero-panel__stats">
        {[
          { label: content.stats.total, value: stats.total },
          { label: content.stats.active, value: stats.active },
          { label: content.stats.inactive, value: stats.inactive },
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