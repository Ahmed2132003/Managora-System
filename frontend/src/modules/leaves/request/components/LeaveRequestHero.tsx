import type { LeaveRequestContent } from "../types/leaveRequest.types";

type LeaveRequestHeroProps = {
  content: LeaveRequestContent;
  calculatedDays: number;
  selectedLeaveTypeName?: string;
  startDate: string;
  endDate: string;
};

export function LeaveRequestHero({
  content,
  calculatedDays,
  selectedLeaveTypeName,
  startDate,
  endDate,
}: LeaveRequestHeroProps) {
  return (
    <section className="hero-panel leave-request-hero">
      <div className="hero-panel__intro">
        <h1>{content.pageTitle}</h1>
        <p>{content.pageSubtitle}</p>
        <div className="hero-tags">
          <span className="pill">{content.summaryTitle}</span>
          <span className="pill pill--accent">
            {calculatedDays} {content.fields.daysLabel}
          </span>
        </div>
      </div>
      <div className="hero-panel__stats">
        {[
          {
            label: content.fields.leaveType,
            value: selectedLeaveTypeName ?? content.fields.leaveTypePlaceholder,
          },
          {
            label: content.fields.startDate,
            value: startDate || "—",
          },
          {
            label: content.fields.endDate,
            value: endDate || "—",
          },
        ].map((stat) => (
          <div key={stat.label} className="stat-card">
            <div className="stat-card__top">
              <span>{stat.label}</span>
              <span className="stat-card__change">{content.statusLabels.draft}</span>
            </div>
            <strong>{stat.value}</strong>
            <div className="stat-card__spark" aria-hidden="true" />
          </div>
        ))}
      </div>
    </section>
  );
}