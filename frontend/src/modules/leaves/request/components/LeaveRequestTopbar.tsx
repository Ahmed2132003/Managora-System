import { TopbarQuickActions } from "../../../../pages/TopbarQuickActions";
import type { LeaveRequestContent } from "../types/leaveRequest.types";

type LeaveRequestTopbarProps = {
  content: LeaveRequestContent;
  isArabic: boolean;
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
};

export function LeaveRequestTopbar({
  content,
  isArabic,
  searchTerm,
  onSearchTermChange,
}: LeaveRequestTopbarProps) {
  return (
    <header className="dashboard-topbar">
      <div className="dashboard-brand">
        <img src="/managora-logo.svg" alt="Managora logo" />
        <div>
          <span className="dashboard-brand__title">{content.brand}</span>
          <span className="dashboard-brand__subtitle">{content.subtitle}</span>
        </div>
      </div>
      <div className="dashboard-search">
        <span aria-hidden="true">⌕</span>
        <input
          type="text"
          placeholder={content.searchPlaceholder}
          aria-label={content.searchPlaceholder}
          value={searchTerm}
          onChange={(event) => onSearchTermChange(event.target.value)}
        />
      </div>
      <TopbarQuickActions isArabic={isArabic} />
    </header>
  );
}