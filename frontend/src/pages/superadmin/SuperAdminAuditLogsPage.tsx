import { useMemo, useState } from "react";
import {
  type AuditLogSuperAdmin,
  useSuperAdminAuditLogs,
  useSuperAdminCompanies,
} from "../../shared/superadmin/hooks";
import { SuperAdminDataTable, type Column } from "../../shared/ui/SuperAdminDataTable";

function formatDateTime(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("ar-EG", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const PAGE_SIZE = 50;

export function SuperAdminAuditLogsPage() {
  const [search, setSearch] = useState("");
  const [companyFilter, setCompanyFilter] = useState<string>("");
  const [entityFilter, setEntityFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");

  const { data: companies } = useSuperAdminCompanies();

  const {
    data,
    count,
    page,
    pageSize,
    setPage,
    isLoading,
    error,
  } = useSuperAdminAuditLogs({
    search: search || undefined,
    company: companyFilter ? Number(companyFilter) : undefined,
    entity: entityFilter || undefined,
    action: actionFilter || undefined,
    pageSize: PAGE_SIZE,
  });

  const columns: Column<AuditLogSuperAdmin>[] = useMemo(
    () => [
      { key: "created_at", header: "التاريخ", render: (row) => formatDateTime(row.created_at) },
      { key: "company_name", header: "الشركة", render: (row) => row.company_name },
      {
        key: "actor_username",
        header: "المستخدم",
        render: (row) => row.actor_username || "—",
      },
      { key: "action", header: "الإجراء", render: (row) => row.action },
      {
        key: "entity",
        header: "الكيان",
        render: (row) => `${row.entity}${row.entity_id ? ` #${row.entity_id}` : ""}`,
      },
    ],
    []
  );

  return (
    <>
      <section className="hero-panel">
        <div className="hero-panel__intro">
          <h1>سجل التدقيق</h1>
          <p>سجل قراءة فقط بكل الإجراءات المسجّلة عبر جميع الشركات.</p>
        </div>
      </section>

      <div className="filters-grid" style={{ marginBottom: 20 }}>
        <label className="field">
          <span>بحث</span>
          <input
            type="text"
            placeholder="بحث بالإجراء أو الكيان أو اسم المستخدم..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>

        <label className="field">
          <span>الشركة</span>
          <select value={companyFilter} onChange={(e) => setCompanyFilter(e.target.value)}>
            <option value="">كل الشركات</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>نوع الكيان</span>
          <input
            type="text"
            placeholder="مثال: Company, User..."
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
          />
        </label>

        <label className="field">
          <span>نوع الإجراء</span>
          <input
            type="text"
            placeholder="مثال: create, update, delete..."
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
          />
        </label>
      </div>

      {error && <p className="helper-text helper-text--error">{error}</p>}

      <SuperAdminDataTable<AuditLogSuperAdmin>
        columns={columns}
        data={data}
        isLoading={isLoading}
        rowKey="id"
        emptyMessage="لا توجد سجلات مطابقة"
        pagination={{
          page,
          pageSize,
          total: count,
          onPageChange: setPage,
        }}
      />
    </>
  );
}