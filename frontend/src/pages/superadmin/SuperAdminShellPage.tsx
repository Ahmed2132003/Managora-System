import { useEffect, useMemo, useState } from "react";
import { NavLink, Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { useMe } from "../../shared/auth/useMe";
import { clearTokens } from "../../shared/auth/tokens";
import "../DashboardPage.css";
import "./superadmin.css";

type ThemeMode = "light" | "dark";

const NAV_ITEMS = [
  { to: "/superadmin", label: "لوحة المعلومات", icon: "📊", end: true },
  { to: "/superadmin/companies", label: "الشركات", icon: "🏢" },
  { to: "/superadmin/users", label: "المستخدمون", icon: "👥" },
  { to: "/superadmin/roles", label: "الأدوار والصلاحيات", icon: "🔑" },
  { to: "/superadmin/subscriptions", label: "الاشتراكات", icon: "💳" },
  { to: "/superadmin/backups", label: "النسخ الاحتياطية", icon: "🗄️" },
  { to: "/superadmin/audit-logs", label: "سجل التدقيق", icon: "📋" },
];

export function SuperAdminShellPage() {
  const { data } = useMe();
  const location = useLocation();
  const navigate = useNavigate();

  const userName = data?.user
    ? `${data.user.first_name || ""} ${data.user.last_name || ""}`.trim() ||
      data.user.username
    : "ضيف";

  const [theme, setTheme] = useState<ThemeMode>(() => {
    const stored =
      typeof window !== "undefined"
        ? window.localStorage.getItem("managora-theme")
        : null;
    return stored === "light" || stored === "dark" ? stored : "light";
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("managora-theme", theme);
  }, [theme]);

  const isActivePath = useMemo(
    () => (path: string, end?: boolean) =>
      end ? location.pathname === path : location.pathname.startsWith(path),
    [location.pathname]
  );

  function handleExit() {
    navigate("/dashboard");
  }

  function handleLogout() {
    clearTokens();
    navigate("/login", { replace: true });
  }

  return (
    <div className="dashboard-page" data-theme={theme} dir="rtl" lang="ar">
      <div className="dashboard-page__glow" aria-hidden="true" />

      {/* ── Topbar ── */}
      <header className="dashboard-topbar">
        <div className="dashboard-brand">
          <img src="/managora-logo.svg" alt="Managora logo" />
          <div>
            <span className="dashboard-brand__title">managora</span>
            <span className="dashboard-brand__subtitle">
              لوحة تحكم السوبر أدمن — إدارة كل الشركات والحسابات
            </span>
          </div>
        </div>

        <span className="pill pill--accent">SUPER ADMIN</span>

        <div className="dashboard-search" style={{ flex: "0 0 auto", minWidth: 0 }}>
          <span aria-hidden="true">👤</span>
          <span style={{ whiteSpace: "nowrap" }}>مرحباً، {userName}</span>
        </div>
      </header>

      <div className="dashboard-shell">
        {/* ── Sidebar ── */}
        <aside className="dashboard-sidebar">
          <div className="sidebar-card">
            <p>لوحة التحكم</p>
            <strong>Super Admin</strong>
          </div>

          <nav className="sidebar-nav" aria-label="القائمة الرئيسية">
            <button
              type="button"
              className="nav-item"
              onClick={() => setTheme((prev) => (prev === "light" ? "dark" : "light"))}
            >
              <span className="nav-icon" aria-hidden="true">
                {theme === "light" ? "🌙" : "☀️"}
              </span>
              المظهر • {theme === "light" ? "داكن" : "فاتح"}
            </button>

            <div className="sidebar-links">
              <span className="sidebar-links__title">القائمة الرئيسية</span>
              {NAV_ITEMS.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={() =>
                    `nav-item${isActivePath(item.to, item.end) ? " nav-item--active" : ""}`
                  }
                >
                  <span className="nav-icon" aria-hidden="true">
                    {item.icon}
                  </span>
                  {item.label}
                </NavLink>
              ))}
            </div>

            <div className="sidebar-links">
              <span className="sidebar-links__title">النظام</span>
              <Link to="/dashboard" className="nav-item">
                <span className="nav-icon" aria-hidden="true">
                  🏠
                </span>
                النظام الرئيسي
              </Link>
            </div>
          </nav>

          <div className="sidebar-footer">
            <button type="button" className="pill-button" onClick={handleExit}>
              ← العودة للنظام
            </button>
            <button
              type="button"
              className="pill-button sidebar-action-button--secondary"
              onClick={handleLogout}
            >
              تسجيل الخروج
            </button>
          </div>
        </aside>

        {/* ── Content ── */}
        <main className="dashboard-main">
          <Outlet />
        </main>
      </div>

      <footer className="dashboard-footer">
        managora — لوحة السوبر أدمن
      </footer>
    </div>
  );
}