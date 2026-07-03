import { useSuperAdminStats } from "../../shared/superadmin/hooks";

function StatCard({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: number | string;
  tone?: "neutral" | "success" | "warning" | "danger";
}) {
  const toneColor: Record<string, string> = {
    neutral: "var(--text-primary, inherit)",
    success: "var(--color-success, #16a34a)",
    warning: "var(--color-warning, #d97706)",
    danger: "var(--color-danger, #dc2626)",
  };

  return (
    <div className="panel" style={{ padding: "20px 24px" }}>
      <p className="helper-text" style={{ marginBottom: 8 }}>
        {label}
      </p>
      <strong style={{ fontSize: 28, color: toneColor[tone] }}>{value}</strong>
    </div>
  );
}

export function SuperAdminDashboardPage() {
  const { data, isLoading, error, refetch } = useSuperAdminStats();

  return (
    <>
      <section className="hero-panel">
        <div className="hero-panel__intro">
          <h1>لوحة المعلومات</h1>
          <p>نظرة عامة سريعة على كل الشركات والمستخدمين في النظام.</p>
        </div>
      </section>

      {error && (
        <p className="helper-text helper-text--error" style={{ marginBottom: 16 }}>
          {error}{" "}
          <button className="table-action" onClick={refetch}>
            إعادة المحاولة
          </button>
        </p>
      )}

      {isLoading && <p className="helper-text">جاري تحميل الإحصائيات...</p>}

      {!isLoading && data && (
        <>
          {data.companies.expiring_soon > 0 && (
            <div
              className="panel"
              style={{
                marginBottom: 20,
                padding: "14px 20px",
                borderInlineStart: "4px solid var(--color-warning, #d97706)",
              }}
            >
              ⚠️ يوجد <strong>{data.companies.expiring_soon}</strong> شركة اشتراكها على وشك
              الانتهاء خلال 7 أيام — راجع صفحة الاشتراكات.
            </div>
          )}

          {data.companies.expired > 0 && (
            <div
              className="panel"
              style={{
                marginBottom: 20,
                padding: "14px 20px",
                borderInlineStart: "4px solid var(--color-danger, #dc2626)",
              }}
            >
              🔴 يوجد <strong>{data.companies.expired}</strong> شركة اشتراكها منتهٍ بالفعل.
            </div>
          )}

          <h2 style={{ margin: "8px 0 12px" }}>الشركات</h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 16,
              marginBottom: 28,
            }}
          >
            <StatCard label="إجمالي الشركات" value={data.companies.total} />
            <StatCard label="نشطة" value={data.companies.active} tone="success" />
            <StatCard label="غير نشطة" value={data.companies.inactive} tone="danger" />
            <StatCard
              label="اشتراك قارب على الانتهاء"
              value={data.companies.expiring_soon}
              tone={data.companies.expiring_soon > 0 ? "warning" : "neutral"}
            />
            <StatCard
              label="اشتراك منتهٍ"
              value={data.companies.expired}
              tone={data.companies.expired > 0 ? "danger" : "neutral"}
            />
          </div>

          <h2 style={{ margin: "8px 0 12px" }}>المستخدمون</h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 16,
            }}
          >
            <StatCard label="إجمالي المستخدمين" value={data.users.total} />
            <StatCard label="نشطون" value={data.users.active} tone="success" />
            <StatCard label="غير نشطين" value={data.users.inactive} tone="danger" />
            <StatCard label="سوبر أدمن" value={data.users.superusers} tone="warning" />
          </div>

          <p className="helper-text" style={{ marginTop: 24 }}>
            آخر تحديث: {new Date(data.generated_at).toLocaleString("ar-EG")}
          </p>
        </>
      )}
    </>
  );
}