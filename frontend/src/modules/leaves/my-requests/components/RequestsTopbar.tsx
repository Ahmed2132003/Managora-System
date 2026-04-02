import { TopbarQuickActions } from "../../../../pages/TopbarQuickActions";
import type { Content } from "../types/myRequests.types";

type RequestsTopbarProps = {
  content: Content;
  isArabic: boolean;
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
};

export function RequestsTopbar({
  content,
  isArabic,
  searchTerm,
  onSearchTermChange,
}: RequestsTopbarProps) {
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