import React from "react";

export type Column<T> = {
  key: string;
  header: string;
  render: (row: T) => React.ReactNode;
};

export type PaginationState = {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
};

type Props<T> = {
  columns: Column<T>[];
  data: T[];
  isLoading?: boolean;
  rowKey: keyof T;
  createLabel?: string;
  onCreate?: () => void;
  onEdit?: (row: T) => void;
  onDelete?: (row: T) => void;
  rowActions?: (row: T) => React.ReactNode;
  pagination?: PaginationState;
  emptyMessage?: string;
};

export function SuperAdminDataTable<T>({
  columns,
  data,
  isLoading = false,
  rowKey,
  createLabel,
  onCreate,
  onEdit,
  onDelete,
  rowActions,
  pagination,
  emptyMessage = "لا توجد بيانات",
}: Props<T>) {
  const hasActions = onEdit || onDelete || rowActions;

  return (
    <div className="panel">
      {onCreate && createLabel && (
        <div className="panel-actions panel-actions--right">
          <button className="action-button" onClick={onCreate}>
            + {createLabel}
          </button>
        </div>
      )}

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col.key}>{col.header}</th>
              ))}
              {hasActions && <th>إجراءات</th>}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={columns.length + (hasActions ? 1 : 0)}>
                  <span className="helper-text">جاري التحميل...</span>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (hasActions ? 1 : 0)}>
                  <span className="helper-text">{emptyMessage}</span>
                </td>
              </tr>
            ) : (
              data.map((row) => (
                <tr key={String(row[rowKey])}>
                  {columns.map((col) => (
                    <td key={col.key}>{col.render(row)}</td>
                  ))}
                  {hasActions && (
                    <td>
                      <div className="table-actions">
                        {onEdit && (
                          <button className="table-action" onClick={() => onEdit(row)}>
                            ✏️ تعديل
                          </button>
                        )}
                        {onDelete && (
                          <button
                            className="table-action table-action--danger"
                            onClick={() => onDelete(row)}
                          >
                            🗑️ حذف
                          </button>
                        )}
                        {rowActions && rowActions(row)}
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pagination && pagination.total > pagination.pageSize && (
        <div className="table-pagination">
          <button
            className="table-action"
            disabled={pagination.page <= 1}
            onClick={() => pagination.onPageChange(pagination.page - 1)}
          >
            ← السابق
          </button>
          <span className="helper-text">
            صفحة {pagination.page} من{" "}
            {Math.ceil(pagination.total / pagination.pageSize)} ({pagination.total} عنصر)
          </span>
          <button
            className="table-action"
            disabled={pagination.page >= Math.ceil(pagination.total / pagination.pageSize)}
            onClick={() => pagination.onPageChange(pagination.page + 1)}
          >
            التالي →
          </button>
        </div>
      )}
    </div>
  );
}

type BadgeVariant = "active" | "inactive" | "warning" | "danger" | "neutral";

const VARIANT_CLASS: Record<BadgeVariant, string> = {
  active: "status-pill--success",
  inactive: "status-pill--neutral",
  warning: "status-pill--warning",
  danger: "status-pill--danger",
  neutral: "status-pill--neutral",
};

export function StatusBadge({ label, variant }: { label: string; variant: BadgeVariant }) {
  return <span className={`status-pill ${VARIANT_CLASS[variant]}`}>{label}</span>;
}