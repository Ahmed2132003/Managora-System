import { TopbarQuickActions } from "../../../pages/TopbarQuickActions";
import type { Content } from "../types/dashboard.types";

type DashboardTopbarProps = {
  content: Content;
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  isArabic: boolean;
};

export function DashboardTopbar({ content, searchTerm, onSearchTermChange, isArabic }: DashboardTopbarProps) {
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