import { useMemo, useState, type FormEvent } from "react";
import {
  type CompanySuperAdmin,
  type SubscriptionStatus,
  useCreateSuperAdminCompany,
  useDeleteSuperAdminCompany,
  useExtendCompanySubscription,
  useSuperAdminCompanies,
  useToggleCompanyActive,
  useUpdateSuperAdminCompany,
} from "../../shared/superadmin/hooks";
import {
  SuperAdminDataTable,
  StatusBadge,
  type Column,
} from "../../shared/ui/SuperAdminDataTable";

function formatDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("ar-EG", { year: "numeric", month: "short", day: "numeric" });
}

const SUBSCRIPTION_STATUS_LABELS: Record<SubscriptionStatus, string> = {
  active: "نشط",
  inactive: "غير نشط",
  expired: "منتهي",
  expiring_soon: "قارب على الانتهاء",
  no_expiry: "بدون تاريخ انتهاء",
};

type BadgeVariant = "active" | "inactive" | "warning" | "danger" | "neutral";

const SUBSCRIPTION_STATUS_VARIANT: Record<SubscriptionStatus, BadgeVariant> = {
  active: "active",
  inactive: "danger",
  expired: "danger",
  expiring_soon: "warning",
  no_expiry: "neutral",
};

type CompanyFormState = {
  name: string;
  is_active: boolean;
  subscription_expires_at: string;
};

const EMPTY_FORM: CompanyFormState = { name: "", is_active: true, subscription_expires_at: "" };

function toDateInputValue(value: string | null): string {
  if (!value) return "";
  return value.slice(0, 10);
}

function CompanyFormModal({
  title,
  initial,
  isSubmitting,
  errorMessage,
  onSubmit,
  onClose,
}: {
  title: string;
  initial: CompanyFormState;
  isSubmitting: boolean;
  errorMessage: string | null;
  onSubmit: (form: CompanyFormState) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<CompanyFormState>(initial);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit(form);
  };

  return (
    <div className="dashboard-modal">
      <div className="dashboard-modal__backdrop" onClick={onClose} />
      <div className="dashboard-modal__content">
        <div className="dashboard-modal__header">
          <div>
            <h2>{title}</h2>
          </div>
          <button className="icon-button" onClick={onClose} type="button">
            ✕
          </button>
        </div>

        <form className="dashboard-modal__body" onSubmit={handleSubmit}>
          <label className="field">
            <span>اسم الشركة</span>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </label>

          <label className="field">
            <span>تاريخ انتهاء الاشتراك (اختياري)</span>
            <input
              type="date"
              value={form.subscription_expires_at}
              onChange={(e) =>
                setForm((f) => ({ ...f, subscription_expires_at: e.target.value }))
              }
            />
          </label>

          <label className="checkbox-field">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
            />
            الشركة نشطة
          </label>

          {errorMessage && <p className="helper-text helper-text--error">{errorMessage}</p>}

          <div className="modal-actions">
            <button
              type="button"
              className="action-button action-button--ghost"
              onClick={onClose}
              disabled={isSubmitting}
            >
              إلغاء
            </button>
            <button type="submit" className="action-button" disabled={isSubmitting}>
              {isSubmitting ? "جاري الحفظ..." : "حفظ"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ExtendSubscriptionModal({
  companyName,
  isSubmitting,
  errorMessage,
  onSubmit,
  onClose,
}: {
  companyName: string;
  isSubmitting: boolean;
  errorMessage: string | null;
  onSubmit: (days: number) => void;
  onClose: () => void;
}) {
  const [days, setDays] = useState(30);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit(days);
  };

  return (
    <div className="dashboard-modal">
      <div className="dashboard-modal__backdrop" onClick={onClose} />
      <div className="dashboard-modal__content">
        <div className="dashboard-modal__header">
          <div>
            <h2>تمديد اشتراك: {companyName}</h2>
          </div>
          <button className="icon-button" onClick={onClose} type="button">
            ✕
          </button>
        </div>

        <form className="dashboard-modal__body" onSubmit={handleSubmit}>
          <label className="field">
            <span>عدد الأيام</span>
            <input
              type="number"
              min={1}
              required
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
            />
          </label>

          {errorMessage && <p className="helper-text helper-text--error">{errorMessage}</p>}

          <div className="modal-actions">
            <button
              type="button"
              className="action-button action-button--ghost"
              onClick={onClose}
              disabled={isSubmitting}
            >
              إلغاء
            </button>
            <button type="submit" className="action-button" disabled={isSubmitting}>
              {isSubmitting ? "جاري التمديد..." : "تمديد"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function SuperAdminCompaniesPage() {
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "active" | "inactive">("all");

  const isActive = activeFilter === "all" ? undefined : activeFilter === "active";

  const { data, isLoading, error, refetch } = useSuperAdminCompanies({
    search: search || undefined,
    isActive,
  });

  const createCompany = useCreateSuperAdminCompany();
  const updateCompany = useUpdateSuperAdminCompany();
  const deleteCompany = useDeleteSuperAdminCompany();
  const toggleActive = useToggleCompanyActive();
  const extendSubscription = useExtendCompanySubscription();

  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [editingCompany, setEditingCompany] = useState<CompanySuperAdmin | null>(null);
  const [extendingCompany, setExtendingCompany] = useState<CompanySuperAdmin | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const columns: Column<CompanySuperAdmin>[] = useMemo(
    () => [
      {
        key: "name",
        header: "الاسم",
        render: (row) => (
          <div className="row-meta">
            <strong>{row.name}</strong>
            <span className="row-meta__sub">{row.slug}</span>
          </div>
        ),
      },
      {
        key: "is_active",
        header: "الحالة",
        render: (row) => (
          <StatusBadge label={row.is_active ? "نشطة" : "معطّلة"} variant={row.is_active ? "active" : "danger"} />
        ),
      },
      {
        key: "subscription_status",
        header: "حالة الاشتراك",
        render: (row) => (
          <StatusBadge
            label={SUBSCRIPTION_STATUS_LABELS[row.subscription_status]}
            variant={SUBSCRIPTION_STATUS_VARIANT[row.subscription_status]}
          />
        ),
      },
      {
        key: "subscription_expires_at",
        header: "تاريخ انتهاء الاشتراك",
        render: (row) => formatDate(row.subscription_expires_at),
      },
      { key: "user_count", header: "عدد المستخدمين", render: (row) => row.user_count },
      { key: "employee_count", header: "عدد الموظفين", render: (row) => row.employee_count },
    ],
    []
  );

  const openCreateModal = () => {
    setFormError(null);
    setEditingCompany(null);
    setModalMode("create");
  };

  const openEditModal = (company: CompanySuperAdmin) => {
    setFormError(null);
    setEditingCompany(company);
    setModalMode("edit");
  };

  const closeModal = () => {
    setModalMode(null);
    setEditingCompany(null);
    setFormError(null);
  };

  const handleFormSubmit = async (form: CompanyFormState) => {
    setFormError(null);
    try {
      const payload = {
        name: form.name.trim(),
        is_active: form.is_active,
        subscription_expires_at: form.subscription_expires_at || null,
      };
      if (modalMode === "create") {
        await createCompany.mutate(payload);
      } else if (modalMode === "edit" && editingCompany) {
        await updateCompany.mutate(editingCompany.id, payload);
      }
      closeModal();
      refetch();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "حدث خطأ غير متوقع");
    }
  };

  const handleDelete = async (company: CompanySuperAdmin) => {
    const confirmed = window.confirm(
      `هل أنت متأكد من حذف شركة "${company.name}"؟ هذا الإجراء لا يمكن التراجع عنه.`
    );
    if (!confirmed) return;
    try {
      await deleteCompany.mutate(company.id);
      refetch();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "تعذر حذف الشركة");
    }
  };

  const handleToggleActive = async (company: CompanySuperAdmin) => {
    try {
      await toggleActive.mutate(company.id);
      refetch();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "تعذر تغيير حالة الشركة");
    }
  };

  const handleExtendSubmit = async (days: number) => {
    if (!extendingCompany) return;
    setFormError(null);
    try {
      await extendSubscription.mutate(extendingCompany.id, days);
      setExtendingCompany(null);
      refetch();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "تعذر تمديد الاشتراك");
    }
  };

  return (
    <>
      <section className="hero-panel">
        <div className="hero-panel__intro">
          <h1>الشركات</h1>
          <p>إدارة كل الشركات المسجّلة في النظام عبر جميع الحسابات.</p>
        </div>
      </section>

      <div className="filters-grid" style={{ marginBottom: 20 }}>
        <label className="field">
          <span>بحث</span>
          <input
            type="text"
            placeholder="بحث بالاسم..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>

        <label className="field">
          <span>الحالة</span>
          <select
            value={activeFilter}
            onChange={(e) => setActiveFilter(e.target.value as "all" | "active" | "inactive")}
          >
            <option value="all">كل الشركات</option>
            <option value="active">نشطة فقط</option>
            <option value="inactive">معطّلة فقط</option>
          </select>
        </label>
      </div>

      {error && <p className="helper-text helper-text--error">{error}</p>}

      <SuperAdminDataTable<CompanySuperAdmin>
        columns={columns}
        data={data}
        isLoading={isLoading}
        rowKey="id"
        createLabel="شركة جديدة"
        onCreate={openCreateModal}
        onEdit={openEditModal}
        onDelete={handleDelete}
        emptyMessage="لا توجد شركات مطابقة"
        rowActions={(row) => (
          <>
            <button className="table-action" onClick={() => handleToggleActive(row)}>
              {row.is_active ? "🔒 تعطيل" : "🔓 تفعيل"}
            </button>
            <button
              className="table-action"
              onClick={() => {
                setFormError(null);
                setExtendingCompany(row);
              }}
            >
              ⏳ تمديد
            </button>
          </>
        )}
      />

      {modalMode && (
        <CompanyFormModal
          title={modalMode === "create" ? "شركة جديدة" : "تعديل بيانات الشركة"}
          initial={
            modalMode === "edit" && editingCompany
              ? {
                  name: editingCompany.name,
                  is_active: editingCompany.is_active,
                  subscription_expires_at: toDateInputValue(editingCompany.subscription_expires_at),
                }
              : EMPTY_FORM
          }
          isSubmitting={createCompany.isLoading || updateCompany.isLoading}
          errorMessage={formError}
          onSubmit={handleFormSubmit}
          onClose={closeModal}
        />
      )}

      {extendingCompany && (
        <ExtendSubscriptionModal
          companyName={extendingCompany.name}
          isSubmitting={extendSubscription.isLoading}
          errorMessage={formError}
          onSubmit={handleExtendSubmit}
          onClose={() => {
            setExtendingCompany(null);
            setFormError(null);
          }}
        />
      )}
    </>
  );
}