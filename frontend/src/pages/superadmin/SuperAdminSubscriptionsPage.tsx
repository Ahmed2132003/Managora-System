import { useMemo, useState, type FormEvent } from "react";
import {
  type SubscriptionCodeSuperAdmin,
  useGenerateSuperAdminSubscriptionCode,
  useSuperAdminCompanies,
  useSuperAdminSubscriptionCodes,
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

function GenerateCodeModal({
  isSubmitting,
  errorMessage,
  generatedCode,
  onGenerate,
  onClose,
}: {
  isSubmitting: boolean;
  errorMessage: string | null;
  generatedCode: SubscriptionCodeSuperAdmin | null;
  onGenerate: (companyId: number) => void;
  onClose: () => void;
}) {
  const { data: companies } = useSuperAdminCompanies();
  const [companyId, setCompanyId] = useState<string>("");
  const [copied, setCopied] = useState(false);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!companyId) return;
    onGenerate(Number(companyId));
  };

  const handleCopy = async () => {
    if (!generatedCode) return;
    try {
      await navigator.clipboard.writeText(generatedCode.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.alert("تعذر نسخ الكود، انسخه يدويًا.");
    }
  };

  return (
    <div className="dashboard-modal">
      <div className="dashboard-modal__backdrop" onClick={onClose} />
      <div className="dashboard-modal__content">
        <div className="dashboard-modal__header">
          <div>
            <h2>توليد كود اشتراك</h2>
          </div>
          <button className="icon-button" onClick={onClose} type="button">
            ✕
          </button>
        </div>

        {!generatedCode ? (
          <form className="dashboard-modal__body" onSubmit={handleSubmit}>
            <label className="field">
              <span>الشركة</span>
              <select
                required
                value={companyId}
                onChange={(e) => setCompanyId(e.target.value)}
              >
                <option value="">اختر شركة</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>

            <p className="helper-text">
              الكود صالح لمدة 24 ساعة فقط من لحظة التوليد (مدة ثابتة في النظام).
            </p>

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
                {isSubmitting ? "جاري التوليد..." : "توليد"}
              </button>
            </div>
          </form>
        ) : (
          <div className="dashboard-modal__body">
            <p className="helper-text">تم توليد الكود بنجاح لشركة "{generatedCode.company_name}":</p>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "14px 16px",
                border: "1px dashed var(--border-color, #999)",
                borderRadius: 8,
                fontSize: 20,
                fontWeight: 700,
                letterSpacing: 2,
                justifyContent: "center",
              }}
            >
              {generatedCode.code}
            </div>
            <p className="helper-text">
              ينتهي في: {formatDateTime(generatedCode.expires_at)}
            </p>

            <div className="modal-actions">
              <button type="button" className="action-button action-button--ghost" onClick={onClose}>
                إغلاق
              </button>
              <button type="button" className="action-button" onClick={handleCopy}>
                {copied ? "✓ تم النسخ" : "📋 نسخ الكود"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function SuperAdminSubscriptionsPage() {
  const [search, setSearch] = useState("");
  const [companyFilter, setCompanyFilter] = useState<string>("");
  const [usedFilter, setUsedFilter] = useState<"all" | "used" | "unused">("all");

  const { data: companies } = useSuperAdminCompanies();

  const isUsed = usedFilter === "all" ? undefined : usedFilter === "used";

  const { data, isLoading, error, refetch } = useSuperAdminSubscriptionCodes({
    search: search || undefined,
    company: companyFilter ? Number(companyFilter) : undefined,
    isUsed,
  });

  const generateCode = useGenerateSuperAdminSubscriptionCode();

  const [modalOpen, setModalOpen] = useState(false);
  const [generatedCode, setGeneratedCode] = useState<SubscriptionCodeSuperAdmin | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const columns: Column<SubscriptionCodeSuperAdmin>[] = useMemo(
    () => [
      { key: "code", header: "الكود", render: (row) => <code>{row.code}</code> },
      { key: "company_name", header: "الشركة", render: (row) => row.company_name },
      {
        key: "is_used",
        header: "الحالة",
        render: (row) => (
          <StatusBadge
            label={row.is_used ? "مستخدَم" : "متاح"}
            variant={row.is_used ? "neutral" : "active"}
          />
        ),
      },
      { key: "expires_at", header: "تاريخ الانتهاء", render: (row) => formatDateTime(row.expires_at) },
      { key: "created_at", header: "تاريخ الإنشاء", render: (row) => formatDateTime(row.created_at) },
    ],
    []
  );

  const openModal = () => {
    setFormError(null);
    setGeneratedCode(null);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setGeneratedCode(null);
    setFormError(null);
    refetch();
  };

  const handleGenerate = async (companyId: number) => {
    setFormError(null);
    try {
      const result = await generateCode.mutate(companyId);
      setGeneratedCode(result);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "تعذر توليد الكود");
    }
  };

  return (
    <>
      <section className="hero-panel">
        <div className="hero-panel__intro">
          <h1>أكواد الاشتراك</h1>
          <p>توليد ومتابعة أكواد تفعيل الاشتراك لكل الشركات.</p>
        </div>
      </section>

      <div className="filters-grid" style={{ marginBottom: 20 }}>
        <label className="field">
          <span>بحث</span>
          <input
            type="text"
            placeholder="بحث بالكود أو اسم الشركة..."
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
            value={usedFilter}
            onChange={(e) => setUsedFilter(e.target.value as "all" | "used" | "unused")}
          >
            <option value="all">الكل</option>
            <option value="unused">متاح فقط</option>
            <option value="used">مستخدَم فقط</option>
          </select>
        </label>
      </div>

      {error && <p className="helper-text helper-text--error">{error}</p>}

      <SuperAdminDataTable<SubscriptionCodeSuperAdmin>
        columns={columns}
        data={data}
        isLoading={isLoading}
        rowKey="id"
        createLabel="توليد كود جديد"
        onCreate={openModal}
        emptyMessage="لا توجد أكواد مطابقة"
      />

      {modalOpen && (
        <GenerateCodeModal
          isSubmitting={generateCode.isLoading}
          errorMessage={formError}
          generatedCode={generatedCode}
          onGenerate={handleGenerate}
          onClose={closeModal}
        />
      )}
    </>
  );
}