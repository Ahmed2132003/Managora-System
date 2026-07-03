import { useMemo, useState, type FormEvent } from "react";
import {
  type CreateUserPayload,
  type RoleSuperAdmin,
  type UpdateUserPayload,
  type UserSuperAdmin,
  useAssignUserRole,
  useCreateSuperAdminUser,
  useDeleteSuperAdminUser,
  useResetUserPassword,
  useSuperAdminCompanies,
  useSuperAdminRoles,
  useSuperAdminUsers,
  useUpdateSuperAdminUser,
} from "../../shared/superadmin/hooks";
import { useMe } from "../../shared/auth/useMe";
import {
  SuperAdminDataTable,
  StatusBadge,
  type Column,
} from "../../shared/ui/SuperAdminDataTable";

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("ar-EG", { year: "numeric", month: "short", day: "numeric" });
}

type UserFormState = {
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  is_active: boolean;
  password: string;
  company: string; // "" = بدون شركة
  role_ids: number[];
};

const EMPTY_FORM: UserFormState = {
  username: "",
  email: "",
  first_name: "",
  last_name: "",
  phone_number: "",
  is_active: true,
  password: "",
  company: "",
  role_ids: [],
};

// ── فورم إنشاء / تعديل مستخدم ────────────────────────────────────────────

function UserFormModal({
  title,
  initial,
  isCreate,
  isSubmitting,
  errorMessage,
  onSubmit,
  onClose,
}: {
  title: string;
  initial: UserFormState;
  isCreate: boolean;
  isSubmitting: boolean;
  errorMessage: string | null;
  onSubmit: (form: UserFormState) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<UserFormState>(initial);
  const { data: companies } = useSuperAdminCompanies();

  const selectedCompanyId = form.company ? Number(form.company) : undefined;
  const { data: companyRoles, isLoading: rolesLoading } = useSuperAdminRoles(
    selectedCompanyId ? { company: selectedCompanyId } : {}
  );

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit(form);
  };

  const toggleRole = (roleId: number) => {
    setForm((f) => ({
      ...f,
      role_ids: f.role_ids.includes(roleId)
        ? f.role_ids.filter((id) => id !== roleId)
        : [...f.role_ids, roleId],
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
            <span>اسم المستخدم</span>
            <input
              type="text"
              required
              value={form.username}
              onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
            />
          </label>

          <label className="field">
            <span>البريد الإلكتروني</span>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            />
          </label>

          <label className="field">
            <span>الاسم الأول</span>
            <input
              type="text"
              value={form.first_name}
              onChange={(e) => setForm((f) => ({ ...f, first_name: e.target.value }))}
            />
          </label>

          <label className="field">
            <span>الاسم الأخير</span>
            <input
              type="text"
              value={form.last_name}
              onChange={(e) => setForm((f) => ({ ...f, last_name: e.target.value }))}
            />
          </label>

          <label className="field">
            <span>رقم الهاتف</span>
            <input
              type="text"
              value={form.phone_number}
              onChange={(e) => setForm((f) => ({ ...f, phone_number: e.target.value }))}
            />
          </label>

          {isCreate && (
            <label className="field">
              <span>كلمة المرور</span>
              <input
                type="password"
                required
                minLength={8}
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              />
            </label>
          )}

          <label className="field">
            <span>الشركة</span>
            <select
              value={form.company}
              onChange={(e) =>
                setForm((f) => ({ ...f, company: e.target.value, role_ids: [] }))
              }
            >
              <option value="">بدون شركة</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>

          {isCreate && (
            <div className="field">
              <span>الأدوار {form.company ? "" : "(اختر شركة أولاً)"}</span>
              {form.company && rolesLoading && (
                <p className="helper-text">جاري تحميل الأدوار...</p>
              )}
              {form.company && !rolesLoading && companyRoles.length === 0 && (
                <p className="helper-text">لا توجد أدوار لهذه الشركة بعد</p>
              )}
              {form.company && !rolesLoading && companyRoles.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {companyRoles.map((role) => (
                    <label key={role.id} className="checkbox-field">
                      <input
                        type="checkbox"
                        checked={form.role_ids.includes(role.id)}
                        onChange={() => toggleRole(role.id)}
                      />
                      {role.name}
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          <label className="checkbox-field">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
            />
            المستخدم نشط
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

// ── فورم إعادة تعيين كلمة المرور ─────────────────────────────────────────

function ResetPasswordModal({
  username,
  isSubmitting,
  errorMessage,
  onSubmit,
  onClose,
}: {
  username: string;
  isSubmitting: boolean;
  errorMessage: string | null;
  onSubmit: (newPassword: string) => void;
  onClose: () => void;
}) {
  const [password, setPassword] = useState("");

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit(password);
  };

  return (
    <div className="dashboard-modal">
      <div className="dashboard-modal__backdrop" onClick={onClose} />
      <div className="dashboard-modal__content">
        <div className="dashboard-modal__header">
          <div>
            <h2>تغيير كلمة مرور: {username}</h2>
          </div>
          <button className="icon-button" onClick={onClose} type="button">
            ✕
          </button>
        </div>

        <form className="dashboard-modal__body" onSubmit={handleSubmit}>
          <label className="field">
            <span>كلمة المرور الجديدة</span>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
              {isSubmitting ? "جاري الحفظ..." : "تغيير كلمة المرور"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── فورم تعيين دور ────────────────────────────────────────────────────────

function AssignRoleModal({
  user,
  isSubmitting,
  errorMessage,
  onSubmit,
  onClose,
}: {
  user: UserSuperAdmin;
  isSubmitting: boolean;
  errorMessage: string | null;
  onSubmit: (roleId: number) => void;
  onClose: () => void;
}) {
  const { data: roles, isLoading } = useSuperAdminRoles(
    user.company ? { company: user.company } : {}
  );
  const [roleId, setRoleId] = useState<number | "">("");

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (roleId === "") return;
    onSubmit(Number(roleId));
  };

  return (
    <div className="dashboard-modal">
      <div className="dashboard-modal__backdrop" onClick={onClose} />
      <div className="dashboard-modal__content">
        <div className="dashboard-modal__header">
          <div>
            <h2>تعيين دور: {user.username}</h2>
          </div>
          <button className="icon-button" onClick={onClose} type="button">
            ✕
          </button>
        </div>

        <form className="dashboard-modal__body" onSubmit={handleSubmit}>
          {!user.company && (
            <p className="helper-text helper-text--error">
              هذا المستخدم غير مرتبط بأي شركة، لا يمكن تعيين دور له.
            </p>
          )}

          {user.company && isLoading && <p className="helper-text">جاري تحميل الأدوار...</p>}

          {user.company && !isLoading && (
            <label className="field">
              <span>الدور</span>
              <select
                required
                value={roleId}
                onChange={(e) => setRoleId(e.target.value ? Number(e.target.value) : "")}
              >
                <option value="">اختر دورًا</option>
                {roles.map((role: RoleSuperAdmin) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </select>
            </label>
          )}

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
            <button
              type="submit"
              className="action-button"
              disabled={isSubmitting || !user.company}
            >
              {isSubmitting ? "جاري التعيين..." : "تعيين"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── الصفحة الرئيسية ───────────────────────────────────────────────────────

export function SuperAdminUsersPage() {
  const { data: me } = useMe();
  const currentUserId = me?.user?.id;

  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "active" | "inactive">("all");
  const [companyFilter, setCompanyFilter] = useState<string>("");

  const { data: companies } = useSuperAdminCompanies();

  const isActive = activeFilter === "all" ? undefined : activeFilter === "active";

  const { data, isLoading, error, refetch } = useSuperAdminUsers({
    search: search || undefined,
    isActive,
    company: companyFilter ? Number(companyFilter) : undefined,
  });

  const createUser = useCreateSuperAdminUser();
  const updateUser = useUpdateSuperAdminUser();
  const deleteUser = useDeleteSuperAdminUser();
  const resetPassword = useResetUserPassword();
  const assignRole = useAssignUserRole();

  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [editingUser, setEditingUser] = useState<UserSuperAdmin | null>(null);
  const [resettingUser, setResettingUser] = useState<UserSuperAdmin | null>(null);
  const [assigningUser, setAssigningUser] = useState<UserSuperAdmin | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const columns: Column<UserSuperAdmin>[] = useMemo(
    () => [
      {
        key: "username",
        header: "اسم المستخدم",
        render: (row) => (
          <div className="row-meta">
            <strong>{row.username}</strong>
            <span className="row-meta__sub">{row.email || "—"}</span>
          </div>
        ),
      },
      {
        key: "full_name",
        header: "الاسم الكامل",
        render: (row) => `${row.first_name || ""} ${row.last_name || ""}`.trim() || "—",
      },
      {
        key: "company_name",
        header: "الشركة",
        render: (row) => row.company_name || "بدون شركة",
      },
      {
        key: "roles",
        header: "الأدوار",
        render: (row) =>
          row.roles.length > 0 ? (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {row.roles.map((r) => (
                <StatusBadge key={r.id} label={r.name} variant="neutral" />
              ))}
            </div>
          ) : (
            "—"
          ),
      },
      {
        key: "is_superuser",
        header: "سوبر أدمن",
        render: (row) =>
          row.is_superuser ? (
            <StatusBadge label="سوبر أدمن" variant="warning" />
          ) : (
            "—"
          ),
      },
      {
        key: "is_active",
        header: "الحالة",
        render: (row) => (
          <StatusBadge label={row.is_active ? "نشط" : "معطّل"} variant={row.is_active ? "active" : "danger"} />
        ),
      },
      {
        key: "date_joined",
        header: "تاريخ الانضمام",
        render: (row) => formatDate(row.date_joined),
      },
    ],
    []
  );

  const openCreateModal = () => {
    setFormError(null);
    setEditingUser(null);
    setModalMode("create");
  };

  const openEditModal = (user: UserSuperAdmin) => {
    setFormError(null);
    setEditingUser(user);
    setModalMode("edit");
  };

  const closeModal = () => {
    setModalMode(null);
    setEditingUser(null);
    setFormError(null);
  };

  const handleFormSubmit = async (form: UserFormState) => {
    setFormError(null);
    try {
      if (modalMode === "create") {
        const payload: CreateUserPayload = {
          username: form.username.trim(),
          email: form.email.trim() || undefined,
          first_name: form.first_name.trim() || undefined,
          last_name: form.last_name.trim() || undefined,
          phone_number: form.phone_number.trim() || undefined,
          is_active: form.is_active,
          password: form.password,
          company: form.company ? Number(form.company) : null,
          role_ids: form.role_ids.length > 0 ? form.role_ids : undefined,
        };
        await createUser.mutate(payload);
      } else if (modalMode === "edit" && editingUser) {
        const payload: UpdateUserPayload = {
          username: form.username.trim(),
          email: form.email.trim(),
          first_name: form.first_name.trim(),
          last_name: form.last_name.trim(),
          phone_number: form.phone_number.trim(),
          is_active: form.is_active,
          company: form.company ? Number(form.company) : null,
        };
        await updateUser.mutate(editingUser.id, payload);
      }
      closeModal();
      refetch();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "حدث خطأ غير متوقع");
    }
  };

  const handleDelete = async (user: UserSuperAdmin) => {
    if (user.id === currentUserId) {
      window.alert("لا يمكنك حذف حسابك الخاص.");
      return;
    }
    const confirmed = window.confirm(
      `هل أنت متأكد من حذف المستخدم "${user.username}"؟ هذا الإجراء لا يمكن التراجع عنه.`
    );
    if (!confirmed) return;
    try {
      await deleteUser.mutate(user.id);
      refetch();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "تعذر حذف المستخدم");
    }
  };

  const handleResetSubmit = async (newPassword: string) => {
    if (!resettingUser) return;
    setFormError(null);
    try {
      await resetPassword.mutate(resettingUser.id, newPassword);
      setResettingUser(null);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "تعذر تغيير كلمة المرور");
    }
  };

  const handleAssignSubmit = async (roleId: number) => {
    if (!assigningUser) return;
    setFormError(null);
    try {
      await assignRole.mutate(assigningUser.id, roleId);
      setAssigningUser(null);
      refetch();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "تعذر تعيين الدور");
    }
  };

  return (
    <>
      <section className="hero-panel">
        <div className="hero-panel__intro">
          <h1>المستخدمون</h1>
          <p>إدارة كل مستخدمي النظام عبر جميع الشركات.</p>
        </div>
      </section>

      <div className="filters-grid" style={{ marginBottom: 20 }}>
        <label className="field">
          <span>بحث</span>
          <input
            type="text"
            placeholder="بحث بالاسم أو البريد..."
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
          <span>الحالة</span>
          <select
            value={activeFilter}
            onChange={(e) => setActiveFilter(e.target.value as "all" | "active" | "inactive")}
          >
            <option value="all">كل المستخدمين</option>
            <option value="active">نشط فقط</option>
            <option value="inactive">معطّل فقط</option>
          </select>
        </label>
      </div>

      {error && <p className="helper-text helper-text--error">{error}</p>}

      <SuperAdminDataTable<UserSuperAdmin>
        columns={columns}
        data={data}
        isLoading={isLoading}
        rowKey="id"
        createLabel="مستخدم جديد"
        onCreate={openCreateModal}
        onEdit={openEditModal}
        onDelete={handleDelete}
        emptyMessage="لا يوجد مستخدمون مطابقون"
        rowActions={(row) => (
          <>
            <button
              className="table-action"
              onClick={() => {
                setFormError(null);
                setResettingUser(row);
              }}
            >
              🔑 كلمة المرور
            </button>
            <button
              className="table-action"
              onClick={() => {
                setFormError(null);
                setAssigningUser(row);
              }}
            >
              🏷️ تعيين دور
            </button>
          </>
        )}
      />

      {modalMode && (
        <UserFormModal
          title={modalMode === "create" ? "مستخدم جديد" : "تعديل بيانات المستخدم"}
          isCreate={modalMode === "create"}
          initial={
            modalMode === "edit" && editingUser
              ? {
                  username: editingUser.username,
                  email: editingUser.email,
                  first_name: editingUser.first_name,
                  last_name: editingUser.last_name,
                  phone_number: editingUser.phone_number,
                  is_active: editingUser.is_active,
                  password: "",
                  company: editingUser.company ? String(editingUser.company) : "",
                  role_ids: [],
                }
              : EMPTY_FORM
          }
          isSubmitting={createUser.isLoading || updateUser.isLoading}
          errorMessage={formError}
          onSubmit={handleFormSubmit}
          onClose={closeModal}
        />
      )}

      {resettingUser && (
        <ResetPasswordModal
          username={resettingUser.username}
          isSubmitting={resetPassword.isLoading}
          errorMessage={formError}
          onSubmit={handleResetSubmit}
          onClose={() => {
            setResettingUser(null);
            setFormError(null);
          }}
        />
      )}

      {assigningUser && (
        <AssignRoleModal
          user={assigningUser}
          isSubmitting={assignRole.isLoading}
          errorMessage={formError}
          onSubmit={handleAssignSubmit}
          onClose={() => {
            setAssigningUser(null);
            setFormError(null);
          }}
        />
      )}
    </>
  );
}