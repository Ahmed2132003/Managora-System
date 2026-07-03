import { useMemo, useState } from "react";
import {
  type BackupSuperAdmin,
  useDownloadSuperAdminBackup,
  useRestoreSuperAdminBackup,
  useSuperAdminBackups,
  useSuperAdminCompanies,
} from "../../shared/superadmin/hooks";
import {
  SuperAdminDataTable,
  StatusBadge,
  type Column,
} from "../../shared/ui/SuperAdminDataTable";

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

const STATUS_LABELS: Record<BackupSuperAdmin["status"], string> = {
  ready: "جاهزة",
  failed: "فشلت",
  restored: "تم استرجاعها",
};

const STATUS_VARIANT: Record<BackupSuperAdmin["status"], "active" | "danger" | "warning"> = {
  ready: "active",
  failed: "danger",
  restored: "warning",
};

const TYPE_LABELS: Record<BackupSuperAdmin["backup_type"], string> = {
  manual: "يدوية",
  automatic: "تلقائية",
};

export function SuperAdminBackupsPage() {
  const [search, setSearch] = useState("");
  const [companyFilter, setCompanyFilter] = useState<string>("");

  const { data: companies } = useSuperAdminCompanies();

  const { data, isLoading, error, refetch } = useSuperAdminBackups({
    search: search || undefined,
    company: companyFilter ? Number(companyFilter) : undefined,
  });

  const downloadBackup = useDownloadSuperAdminBackup();
  const restoreBackup = useRestoreSuperAdminBackup();

  const [actionError, setActionError] = useState<string | null>(null);
  const [restoringId, setRestoringId] = useState<number | null>(null);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  const columns: Column<BackupSuperAdmin>[] = useMemo(
    () => [
      { key: "company_name", header: "الشركة", render: (row) => row.company_name },
      { key: "backup_type", header: "النوع", render: (row) => TYPE_LABELS[row.backup_type] },
      {
        key: "status",
        header: "الحالة",
        render: (row) => (
          <StatusBadge label={STATUS_LABELS[row.status]} variant={STATUS_VARIANT[row.status]} />
        ),
      },
      { key: "row_count", header: "عدد الصفوف", render: (row) => row.row_count },
      { key: "created_at", header: "تاريخ الإنشاء", render: (row) => formatDateTime(row.created_at) },
    ],
    []
  );

  const handleDownload = async (backup: BackupSuperAdmin) => {
    setActionError(null);
    setDownloadingId(backup.id);
    try {
      await downloadBackup.mutate(backup);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "تعذر تنزيل النسخة الاحتياطية");
    } finally {
      setDownloadingId(null);
    }
  };

  const handleRestore = async (backup: BackupSuperAdmin) => {
    const confirmed = window.confirm(
      `⚠️ تحذير: استرجاع هذه النسخة الاحتياطية سيستبدل بيانات شركة "${backup.company_name}" الحالية بالكامل بالبيانات المحفوظة في هذه النسخة (${formatDateTime(
        backup.created_at
      )}). هذا الإجراء لا يمكن التراجع عنه. هل أنت متأكد تمامًا من المتابعة؟`
    );
    if (!confirmed) return;

    setActionError(null);
    setRestoringId(backup.id);
    try {
      await restoreBackup.mutate(backup.id);
      window.alert(`تم استرجاع النسخة الاحتياطية لشركة "${backup.company_name}" بنجاح.`);
      refetch();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "تعذر استرجاع النسخة الاحتياطية");
    } finally {
      setRestoringId(null);
    }
  };

  return (
    <>
      <section className="hero-panel">
        <div className="hero-panel__intro">
          <h1>النسخ الاحتياطية</h1>
          <p>عرض وتنزيل واسترجاع النسخ الاحتياطية لكل الشركات.</p>
        </div>
      </section>

      <div className="filters-grid" style={{ marginBottom: 20 }}>
        <label className="field">
          <span>بحث</span>
          <input
            type="text"
            placeholder="بحث باسم الشركة أو النوع..."
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
      </div>

      {(error || actionError) && (
        <p className="helper-text helper-text--error">{error || actionError}</p>
      )}

      <SuperAdminDataTable<BackupSuperAdmin>
        columns={columns}
        data={data}
        isLoading={isLoading}
        rowKey="id"
        emptyMessage="لا توجد نسخ احتياطية مطابقة"
        rowActions={(row) => (
          <>
            <button
              className="table-action"
              onClick={() => handleDownload(row)}
              disabled={downloadingId === row.id}
            >
              {downloadingId === row.id ? "جاري التنزيل..." : "⬇️ تنزيل"}
            </button>
            <button
              className="table-action table-action--danger"
              onClick={() => handleRestore(row)}
              disabled={restoringId === row.id}
            >
              {restoringId === row.id ? "جاري الاسترجاع..." : "♻️ استرجاع"}
            </button>
          </>
        )}
      />
    </>
  );
}