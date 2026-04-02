import type { SelfAttendanceContent } from "../config/selfAttendanceContent";
import type { AttendanceRecordWithApprovals } from "../types/selfAttendance.types";
import { getTimeLabel } from "../utils/selfAttendance.utils";

type AttendanceHeroProps = {
  content: SelfAttendanceContent;
  statusKey: string;
  todayRecord?: AttendanceRecordWithApprovals;
  isArabic: boolean;
};

export function AttendanceHero({ content, statusKey, todayRecord, isArabic }: AttendanceHeroProps) {
  return (
    <section className="hero-panel attendance-hero">
      <div className="hero-panel__intro">
        <h1>{content.pageTitle}</h1>
        <p>{content.pageSubtitle}</p>
        <div className="hero-tags">
          <span className="pill">{content.todayLabel}</span>
          <span className="pill pill--accent">
            {content.statusLabel}: {content.statusMap[statusKey]}
          </span>
        </div>
      </div>

      <div className="hero-panel__stats">
        {[
          {
            label: content.rows.checkIn,
            value: getTimeLabel(todayRecord?.check_in_time ?? null, isArabic ? "ar" : "en"),
          },
          {
            label: content.rows.checkOut,
            value: getTimeLabel(todayRecord?.check_out_time ?? null, isArabic ? "ar" : "en"),
          },
          { label: content.rows.lateMinutes, value: todayRecord?.late_minutes ?? "-" },
          { label: content.rows.earlyLeaveMinutes, value: todayRecord?.early_leave_minutes ?? "-" },
        ].map((stat) => (
          <div key={stat.label} className="stat-card">
            <div className="stat-card__top">
              <span>{stat.label}</span>
              <span className="stat-card__change">{content.todayLabel}</span>
            </div>
            <strong>{stat.value}</strong>
            <div className="stat-card__spark" aria-hidden="true" />
          </div>
        ))}
      </div>
    </section>
  );
}