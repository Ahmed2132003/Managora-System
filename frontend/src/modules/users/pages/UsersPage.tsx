import { useEffect, useMemo, useState } from "react";
import { notifications } from "@mantine/notifications";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { useLocation, useNavigate } from "react-router-dom";

import { useCan } from "../../../shared/auth/useCan";
import { clearTokens } from "../../../shared/auth/tokens";
import { useMe } from "../../../shared/auth/useMe";
import { resolvePrimaryRole } from "../../../shared/auth/roleNavigation";
import { buildHrSidebarLinks } from "../../../shared/navigation/hrSidebarLinks";
import { TopbarQuickActions } from "../../../pages/TopbarQuickActions";
import "../../../pages/DashboardPage.css";
import "../../../pages/UsersPage.css";
import { CreateCompanyModal } from "../components/CreateCompanyModal";
import { CreateUserModal } from "../components/CreateUserModal";
import { EditUserModal } from "../components/EditUserModal";
import { UsersFilters } from "../components/UsersFilters";
import { UsersHeader } from "../components/UsersHeader";
import { UsersTable } from "../components/UsersTable";
import { useUsersNavigation } from "../hooks/useUsersNavigation";
import {
  createCompany,
  createUser,
  deleteUser,
  fetchCompanies,
  fetchRoles,
  fetchUsers,
  formatApiError,
  isUnauthorized,
  updateUser,
} from "../services/usersApi";
import {
  contentMap,
  createSchema,
  defaultCreateValues,
  defaultEditValues,
  editSchema,
  type Company,
  type CreateFormValues,
  type EditFormValues,
  type Language,
  type Role,
  type ThemeMode,
  type User,
} from "../types/users";

export function UsersPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const { data, isLoading, isError } = useMe();
  const isSuperuser = Boolean(data?.user.is_superuser);
  const companyId = data?.company?.id;

  const [language, setLanguage] = useState<Language>(() => {
    const stored = typeof window !== "undefined" ? window.localStorage.getItem("managora-language") : null;
    return stored === "en" || stored === "ar" ? stored : "ar";
  });
  const [theme, setTheme] = useState<ThemeMode>(() => {
    const stored = typeof window !== "undefined" ? window.localStorage.getItem("managora-theme") : null;
    return stored === "light" || stored === "dark" ? stored : "light";
  });

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [createOpened, setCreateOpened] = useState(false);
  const [editOpened, setEditOpened] = useState(false);
  const [companyModalOpen, setCompanyModalOpen] = useState(false);
  const [companyName, setCompanyName] = useState("");

  const content = useMemo(() => contentMap[language], [language]);
  const isArabic = language === "ar";
  const userPermissions = useMemo(() => data?.permissions ?? [], [data?.permissions]);
  const primaryRole = useMemo(() => resolvePrimaryRole(data), [data]);
  const hrSidebarLinks = useMemo(() => buildHrSidebarLinks(content.nav, isArabic), [content.nav, isArabic]);
  const accountCompanyName = data?.company.name || content.brand;

  const canCreate = useCan("users.create");
  const canEdit = useCan("users.edit");
  const canDelete = useCan("users.delete");
  const canView = useCan("users.view");

  const createForm = useForm<CreateFormValues>({
    resolver: zodResolver(createSchema),
    defaultValues: defaultCreateValues,
  });

  const editForm = useForm<EditFormValues>({
    resolver: zodResolver(editSchema),
    defaultValues: defaultEditValues,
  });

  const handleUnauthorized = (err: unknown) => {
    if (!isUnauthorized(err)) return;
    notifications.show({
      title: "Session expired",
      message: language === "ar" ? "انتهت الجلسة. برجاء تسجيل الدخول مرة أخرى." : "Your session has expired. Please log in again.",
      color: "red",
    });
    clearTokens();
    queryClient.clear();
    navigate("/login", { replace: true });
  };

  useEffect(() => {
    if (typeof window !== "undefined") window.localStorage.setItem("managora-language", language);
  }, [language]);

  useEffect(() => {
    if (typeof window !== "undefined") window.localStorage.setItem("managora-theme", theme);
  }, [theme]);

  useEffect(() => {
    if (!isLoading && data && !canView) navigate("/dashboard", { replace: true });
  }, [canView, data, isLoading, navigate]);

  const rolesQuery = useQuery<Role[], unknown>({
    queryKey: ["roles", companyId],
    enabled: !isLoading && !isError,
    retry: false,
    queryFn: fetchRoles,
  });

  const companiesQuery = useQuery<Company[], unknown>({
    queryKey: ["companies"],
    enabled: isSuperuser && !isLoading && !isError,
    retry: false,
    queryFn: fetchCompanies,
  });

  const usersQuery = useQuery<User[], unknown>({
    queryKey: ["users", companyId, { search, roleFilter, activeFilter }],
    enabled: !isLoading && !isError,
    retry: false,
    queryFn: () => fetchUsers({ search, roleFilter, activeFilter }),
  });

  useEffect(() => {
    if (rolesQuery.isError) handleUnauthorized(rolesQuery.error);
  }, [rolesQuery.error, rolesQuery.isError]);

  useEffect(() => {
    if (companiesQuery.isError) handleUnauthorized(companiesQuery.error);
  }, [companiesQuery.error, companiesQuery.isError]);

  useEffect(() => {
    if (usersQuery.isError) handleUnauthorized(usersQuery.error);
  }, [usersQuery.error, usersQuery.isError]);

  const createMutation = useMutation({
    mutationFn: async (values: CreateFormValues) => {
      if (isSuperuser && !values.company_id) {
        throw new Error(isArabic ? "يجب اختيار شركة قبل إنشاء المستخدم" : "Company is required for superuser user creation");
      }
      return createUser(values, isSuperuser);
    },
    onSuccess: () => {
      notifications.show({ title: "User created", message: "تم إنشاء المستخدم بنجاح" });
      setCreateOpened(false);
      createForm.reset(defaultCreateValues);
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (err: unknown) => {
      notifications.show({ title: "Create failed", message: formatApiError(err), color: "red" });
    },
  });

  const createCompanyMutation = useMutation({
    mutationFn: createCompany,
    onSuccess: (company) => {
      notifications.show({
        title: "Company created",
        message: isArabic ? "تم إنشاء الشركة بنجاح" : "Company created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      createForm.setValue("company_id", String(company.id), { shouldValidate: true });
      setCompanyModalOpen(false);
      setCompanyName("");
    },
    onError: (err: unknown) => {
      notifications.show({ title: "Company creation failed", message: formatApiError(err), color: "red" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: updateUser,
    onSuccess: () => {
      notifications.show({ title: "User updated", message: "تم تحديث المستخدم" });
      setEditOpened(false);
      editForm.reset(defaultEditValues);
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (err: unknown) => {
      notifications.show({ title: "Update failed", message: formatApiError(err), color: "red" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      notifications.show({ title: "User deleted", message: "تم حذف المستخدم" });
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (err: unknown) => {
      notifications.show({ title: "Delete failed", message: formatApiError(err), color: "red" });
    },
  });

  const allowedRoleNames = useMemo(() => {
    if (isSuperuser) return null;

    const roleNames = new Set((data?.roles ?? []).map((role: Role) => role.name.toLowerCase()));
    if (roleNames.has("manager")) return new Set(["hr", "accountant", "employee"]);
    if (roleNames.has("hr")) return new Set(["accountant", "employee"]);
    return new Set<string>();
  }, [data?.roles, isSuperuser]);

  const roleOptions = useMemo(
    () => (rolesQuery.data ?? []).map((role) => ({ value: String(role.id), label: role.name })),
    [rolesQuery.data]
  );

  const assignableRoleOptions = useMemo(
    () =>
      (rolesQuery.data ?? [])
        .filter((role) => {
          if (!allowedRoleNames) return true;
          if (allowedRoleNames.size === 0) return false;
          return allowedRoleNames.has(role.name.toLowerCase());
        })
        .map((role) => ({ value: String(role.id), label: role.name })),
    [allowedRoleNames, rolesQuery.data]
  );

  const companyOptions = useMemo(
    () => (companiesQuery.data ?? []).map((company) => ({ value: String(company.id), label: company.name })),
    [companiesQuery.data]
  );

  const visibleNavLinks = useUsersNavigation({
    content,
    primaryRole,
    hrSidebarLinks,
    userPermissions,
  });

  const users = usersQuery.data ?? [];
  const activeUsers = users.filter((user) => user.is_active).length;
  const inactiveUsers = users.length - activeUsers;

  function openEdit(user: User) {
    editForm.reset({
      id: user.id,
      username: user.username,
      email: user.email ?? "",
      password: "",
      is_active: user.is_active,
      role_id: user.roles && user.roles.length ? String(user.roles[0].id) : "",
    });
    setEditOpened(true);
  }

  function handleDelete(user: User) {
    if (!window.confirm(content.form.confirmDelete(user.username))) return;
    deleteMutation.mutate(user.id);
  }

  return (
    <div className="dashboard-page users-page" data-theme={theme} dir={isArabic ? "rtl" : "ltr"} lang={language}>
      <div className="dashboard-page__glow" aria-hidden="true" />
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
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <TopbarQuickActions isArabic={isArabic} />
      </header>

      <div className="dashboard-shell">
        <aside className="dashboard-sidebar">
          <div className="sidebar-card">
            <p>{content.pageTitle}</p>
            <strong>{accountCompanyName}</strong>
            {isLoading && <span className="sidebar-note">...loading profile</span>}
            {isError && (
              <span className="sidebar-note sidebar-note--error">
                {isArabic ? "تعذر تحميل بيانات الحساب." : "Unable to load account data."}
              </span>
            )}
          </div>
          <nav className="sidebar-nav" aria-label={content.navigationLabel}>
            <button type="button" className="nav-item" onClick={() => setLanguage((prev) => (prev === "en" ? "ar" : "en"))}>
              <span className="nav-icon" aria-hidden="true">
                🌐
              </span>
              {content.languageLabel} • {isArabic ? "EN" : "AR"}
            </button>
            <button type="button" className="nav-item" onClick={() => setTheme((prev) => (prev === "light" ? "dark" : "light"))}>
              <span className="nav-icon" aria-hidden="true">
                {theme === "light" ? "🌙" : "☀️"}
              </span>
              {content.themeLabel} • {theme === "light" ? "Dark" : "Light"}
            </button>
            <div className="sidebar-links">
              <span className="sidebar-links__title">{content.navigationLabel}</span>
              {visibleNavLinks.map((link) => (
                <button
                  key={link.path}
                  type="button"
                  className={`nav-item${location.pathname === link.path ? " nav-item--active" : ""}`}
                  onClick={() => navigate(link.path)}
                >
                  <span className="nav-icon" aria-hidden="true">
                    {link.icon}
                  </span>
                  {link.label}
                </button>
              ))}
            </div>
          </nav>
          <div className="sidebar-footer">
            <button
              type="button"
              className="pill-button"
              onClick={() => {
                clearTokens();
                navigate("/login", { replace: true });
              }}
            >
              {content.logoutLabel}
            </button>
          </div>
        </aside>

        <main className="dashboard-main">
          <UsersHeader
            content={content}
            usersCount={users.length}
            activeUsers={activeUsers}
            inactiveUsers={inactiveUsers}
            rolesCount={roleOptions.length}
            canCreate={canCreate}
            onCreate={() => {
              createForm.reset(defaultCreateValues);
              setCreateOpened(true);
            }}
          />

          <UsersFilters
            content={content}
            roleFilter={roleFilter}
            activeFilter={activeFilter}
            roleOptions={roleOptions}
            onRoleFilterChange={setRoleFilter}
            onActiveFilterChange={setActiveFilter}
            onClear={() => {
              setRoleFilter(null);
              setActiveFilter(null);
            }}
          />

          <UsersTable
            content={content}
            users={users}
            isLoading={usersQuery.isLoading}
            isError={usersQuery.isError}
            isArabic={isArabic}
            canEdit={canEdit}
            canDelete={canDelete}
            onEdit={openEdit}
            onDelete={handleDelete}
          />
        </main>
      </div>

      <footer className="dashboard-footer">{content.subtitle}</footer>

      <CreateUserModal
        opened={createOpened}
        content={content}
        isSuperuser={isSuperuser}
        form={createForm}
        assignableRoleOptions={assignableRoleOptions}
        companyOptions={companyOptions}
        isSubmitting={createMutation.isPending}
        onClose={() => {
          setCreateOpened(false);
          createForm.reset(defaultCreateValues);
        }}
        onSubmit={(values) => {
          if (isSuperuser && !values.company_id) {
            createForm.setError("company_id", {
              type: "manual",
              message: isArabic ? "الشركة مطلوبة لإنشاء المستخدم." : "Company is required to create a user.",
            });
            return;
          }
          createMutation.mutate(values);
        }}
        onOpenCompanyModal={() => setCompanyModalOpen(true)}
      />

      <CreateCompanyModal
        opened={companyModalOpen}
        content={content}
        companyName={companyName}
        isSubmitting={createCompanyMutation.isPending}
        onClose={() => setCompanyModalOpen(false)}
        onCompanyNameChange={setCompanyName}
        onSubmit={() => {
          if (!companyName.trim()) return;
          createCompanyMutation.mutate(companyName.trim());
        }}
      />

      <EditUserModal
        opened={editOpened}
        content={content}
        form={editForm}
        assignableRoleOptions={assignableRoleOptions}
        isSubmitting={updateMutation.isPending}
        onClose={() => {
          setEditOpened(false);
          editForm.reset(defaultEditValues);
        }}
        onSubmit={(values) => updateMutation.mutate(values)}
      />
    </div>
  );
}