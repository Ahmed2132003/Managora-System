import type { JobTitle } from "../../../../shared/hr/hooks";
import type { JobTitlesContent } from "../types/jobTitles.types";

type JobTitlesTablePanelProps = {
  content: JobTitlesContent;
  isLoading: boolean;
  deletePending: boolean;
  jobTitles: JobTitle[];
  onEdit: (jobTitle: JobTitle) => void;
  onDelete: (id: number) => void;
};

export function JobTitlesTablePanel({
  content,
  isLoading,
  deletePending,
  jobTitles,
  onEdit,
  onDelete,
}: JobTitlesTablePanelProps) {
  return (
    <section className="panel job-titles-panel">
      <div className="panel__header">
        <div>
          <h2>{content.table.title}</h2>
          <p>{content.table.subtitle}</p>
        </div>
      </div>
      {isLoading ? (
        <div className="job-titles-state job-titles-state--loading">{content.table.loading}</div>
      ) : jobTitles.length === 0 ? (
        <div className="job-titles-state">
          <strong>{content.table.emptyTitle}</strong>
          <span>{content.table.emptySubtitle}</span>
        </div>
      ) : (
        <div className="job-titles-table-wrapper">
          <table className="job-titles-table">
            <thead>
              <tr>
                <th>{content.table.name}</th>
                <th>{content.table.status}</th>
                <th>{content.table.actions}</th>
              </tr>
            </thead>
            <tbody>
              {jobTitles.map((jobTitle) => (
                <tr key={jobTitle.id}>
                  <td>{jobTitle.name}</td>
                  <td>
                    <span className="status-pill" data-status={jobTitle.is_active ? "active" : "inactive"}>
                      {jobTitle.is_active ? content.statusMap.active : content.statusMap.inactive}
                    </span>
                  </td>
                  <td>
                    <div className="job-titles-actions">
                      <button type="button" className="ghost-button" onClick={() => onEdit(jobTitle)}>
                        {content.table.edit}
                      </button>
                      <button
                        type="button"
                        className="ghost-button ghost-button--danger"
                        onClick={() => onDelete(jobTitle.id)}
                        disabled={deletePending}
                      >
                        {content.table.delete}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}