import { useMemo, useState, type FormEvent } from "react";
import {
  type PermissionSuperAdmin,
  type RoleSuperAdmin,
  useCreateSuperAdminRole,
  useDeleteSuperAdminRole,
  useSuperAdminCompanies,
  useSuperAdminPermissions,
  useSuperAdminRoles,
  useUpdateSuperAdminRole,
} from "../../shared/superadmin/hooks";
import {
  SuperAdminDataTable,
  type Column,
} from "../../shared/ui/SuperAdminDataTable";

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("ar-EG", { year: "numeric", month: "short", day: "numeric" });
}

type RoleFormState = {
  company: string;
  name: string;
  permission_ids: number[];
};

const EMPTY_ROLE_FORM: RoleFormState = { company: "", name: "", permission_ids: [] };

// ── فورم إنشاء / تعديل دور ────────────────────────────────────────────────

function RoleFormModal({
  title,
  initial,
  isCreate,
  isSubmitting,
  errorMessage,
  onSubmit,
  onClose,
}: {
  title: string;
  initial: RoleFormState;
  isCreate: boolean;
  isSubmitting: boolean;
  errorMessage: string | null;
  onSubmit: (form: RoleFormState) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<RoleFormState>(initial);
  const { data: companies } = useSuperAdminCompanies();
  const { data: permissions, isLoading: permissionsLoading } = useSuperAdminPermissions();

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit(form);
  };

  const togglePermission = (permissionId: number) => {
    setForm((f) => ({
      ...f,
      permission_ids: f.permission_ids.includes(permissionId)
        ? f.permission_ids.filter((id) => id !== permissionId)
        : [...f.permission_ids, permissionId],
    }));
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
            <span>اسم الدور</span>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </label>

          {isCreate && (
            <label className="field">
              <span>الشركة</span>
              <select
                required
                value={form.company}
                onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
              >
                <option value="">اختر شركة</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
          )}

          <div className="field">
            <span>الصلاحيات</span>
            {permissionsLoading && <p className="helper-text">جاري تحميل الصلاحيات...</p>}
            {!permissionsLoading && permissions.length === 0 && (
              <p className="helper-text">لا توجد صلاحيات معرّفة في قاعدة البيانات بعد</p>
            )}
            {!permissionsLoading && permissions.length > 0 && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                  maxHeight: 280,
                  overflowY: "auto",
                  paddingInlineEnd: 8,
                }}
              >
                {permissions.map((perm) => (
                  <label key={perm.id} className="checkbox-field">
                    <input
                      type="checkbox"
                      checked={form.permission_ids.includes(perm.id)}
                      onChange={() => togglePermission(perm.id)}
                    />
                    {perm.name}{" "}
                    <span className="row-meta__sub" style={{ marginInlineStart: 4 }}>
                      ({perm.code})
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>

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

// ── تبويب الأدوار ─────────────────────────────────────────────────────────

function RolesTab() {
  const [companyFilter, setCompanyFilter] = useState<string>("");
  const [search, setSearch] = useState("");

  const { data: companies } = useSuperAdminCompanies();

  const { data, isLoading, error, refetch } = useSuperAdminRoles({
    company: companyFilter ? Number(companyFilter) : undefined,
    search: search || undefined,
  });

  const createRole = useCreateSuperAdminRole();
  const updateRole = useUpdateSuperAdminRole();
  const deleteRole = useDeleteSuperAdminRole();

  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [editingRole, setEditingRole] = useState<RoleSuperAdmin | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const columns: Column<RoleSuperAdmin>[] = useMemo(
    () => [
      { key: "name", header: "الاسم", render: (row) => <strong>{row.name}</strong> },
      { key: "company_name", header: "الشركة", render: (row) => row.company_name },
      {
        key: "permission_count",
        header: "عدد الصلاحيات",
        render: (row) => row.permission_count,
      },
      { key: "created_at", header: "تاريخ الإنشاء", render: (row) => formatDate(row.created_at) },
    ],
    []
  );

  const openCreateModal = () => {
    setFormError(null);
    setEditingRole(null);
    setModalMode("create");
  };

  const openEditModal = (role: RoleSuperAdmin) => {
    setFormError(null);
    setEditingRole(role);
    setModalMode("edit");
  };

  const closeModal = () => {
    setModalMode(null);
    setEditingRole(null);
    setFormError(null);
  };

  const handleFormSubmit = async (form: RoleFormState) => {
    setFormError(null);
    try {
      if (modalMode === "create") {
        await createRole.mutate({
          company: Number(form.company),
          name: form.name.trim(),
          permission_ids: form.permission_ids,
        });
      } else if (modalMode === "edit" && editingRole) {
        await updateRole.mutate(editingRole.id, {
          name: form.name.trim(),
          permission_ids: form.permission_ids,
        });
      }
      closeModal();
      refetch();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "حدث خطأ غير متوقع");
    }
  };

  const handleDelete = async (role: RoleSuperAdmin) => {
    const confirmed = window.confirm(
      `هل أنت متأكد من حذف دور "${role.name}"؟ سيتم إزالته من كل المستخدمين المرتبطين به.`
    );
    if (!confirmed) return;
    try {
      await deleteRole.mutate(role.id);
      refetch();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "تعذر حذف الدور");
    }
  };

  return (
    <>
      <div className="filters-grid" style={{ marginBottom: 20 }}>
        <label className="field">
          <span>بحث</span>
          <input
            type="text"
            placeholder="بحث باسم الدور..."
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

      {error && <p className="helper-text helper-text--error">{error}</p>}

      <SuperAdminDataTable<RoleSuperAdmin>
        columns={columns}
        data={data}
        isLoading={isLoading}
        rowKey="id"
        createLabel="دور جديد"
        onCreate={openCreateModal}
        onEdit={openEditModal}
        onDelete={handleDelete}
        emptyMessage="لا توجد أدوار مطابقة"
      />

      {modalMode && (
        <RoleFormModal
          title={modalMode === "create" ? "دور جديد" : "تعديل الدور"}
          isCreate={modalMode === "create"}
          initial={
            modalMode === "edit" && editingRole
              ? {
                  company: String(editingRole.company),
                  name: editingRole.name,
                  permission_ids: editingRole.permissions.map((p) => p.id),
                }
              : EMPTY_ROLE_FORM
          }
          isSubmitting={createRole.isLoading || updateRole.isLoading}
          errorMessage={formError}
          onSubmit={handleFormSubmit}
          onClose={closeModal}
        />
      )}
    </>
  );
}

// ── تبويب الصلاحيات (قراءة فقط) ──────────────────────────────────────────

function PermissionsTab() {
  const { data, isLoading, error } = useSuperAdminPermissions();

  const columns: Column<PermissionSuperAdmin>[] = useMemo(
    () => [
      { key: "code", header: "الكود", render: (row) => <code>{row.code}</code> },
      { key: "name", header: "الاسم", render: (row) => row.name },
      { key: "created_at", header: "تاريخ الإنشاء", render: (row) => formatDate(row.created_at) },
    ],
    []
  );

  return (
    <>
      {error && <p className="helper-text helper-text--error">{error}</p>}
      <SuperAdminDataTable<PermissionSuperAdmin>
        columns={columns}
        data={data}
        isLoading={isLoading}
        rowKey="id"
        emptyMessage="لا توجد صلاحيات مسجّلة في قاعدة البيانات"
      />
    </>
  );
}

// ── الصفحة الرئيسية ───────────────────────────────────────────────────────

export function SuperAdminRolesPage() {
  const [tab, setTab] = useState<"roles" | "permissions">("roles");

  return (
    <>
      <section className="hero-panel">
        <div className="hero-panel__intro">
          <h1>الأدوار والصلاحيات</h1>
          <p>إدارة الأدوار عبر كل الشركات، ومراجعة الصلاحيات الفعلية في قاعدة البيانات.</p>
        </div>
      </section>

      <div className="modal-actions" style={{ justifyContent: "flex-start", marginBottom: 16 }}>
        <button
          type="button"
          className={`action-button${tab === "roles" ? "" : " action-button--ghost"}`}
          onClick={() => setTab("roles")}
        >
          الأدوار
        </button>
        <button
          type="button"
          className={`action-button${tab === "permissions" ? "" : " action-button--ghost"}`}
          onClick={() => setTab("permissions")}
        >
          الصلاحيات
        </button>
      </div>

      {tab === "roles" ? <RolesTab /> : <PermissionsTab />}
    </>
  );
}