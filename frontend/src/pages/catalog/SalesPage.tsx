import { useMemo, useState } from "react";
import { DashboardShell } from "../DashboardShell";
import "./SalesPage.css";
import { useCatalogItems } from "../../shared/catalog/hooks";
import { useCreateCustomer, useCustomers } from "../../shared/customers/hooks";
import { useInvoices, useRecordSale } from "../../shared/invoices/hooks";

type SaleLine = { item: number; quantity: string; unit_price: string };

const INITIAL_INVOICE_NUMBER = `INV-${Date.now()}`;
const INITIAL_ISSUE_DATE = new Date().toISOString().slice(0, 10);

export function SalesPage() {
  const customers = useCustomers({});
  const catalog = useCatalogItems();
  const invoices = useInvoices();
  const createCustomer = useCreateCustomer();
  const recordSale = useRecordSale();

  const [mode, setMode] = useState<"existing" | "new" | "by_name">("existing");
  const [customerId, setCustomerId] = useState<string>("");
  const [customerName, setCustomerName] = useState("");
  const [newCustomer, setNewCustomer] = useState({ code: "", name: "", email: "", phone: "", address: "", credit_limit: "", payment_terms_days: 0, is_active: true });

  const [invoiceNumber, setInvoiceNumber] = useState(INITIAL_INVOICE_NUMBER);
  const [issueDate, setIssueDate] = useState(INITIAL_ISSUE_DATE);
  const [dueDate, setDueDate] = useState("");
  const [taxRate, setTaxRate] = useState<number | string>("");  
  const [notes, setNotes] = useState("");

  // ملاحظة (Phase 7 - تبسيط نظام الحسابات): expense_account/paid_from_account/
  // cost_center لم تعد تُرسَل من الفرونت إند - الباك إند يحدد حساب EXPENSE
  // الموحد للشركة تلقائيًا دائمًا (انظر InvoiceViewSet.record_sale في Phase 5).
  const [paymentMethod, setPaymentMethod] = useState("auto");
  const [expenseVendorName, setExpenseVendorName] = useState("");
  const [savedInvoiceDateFilter, setSavedInvoiceDateFilter] = useState("");
  const [showAllSavedInvoices, setShowAllSavedInvoices] = useState(false);

  const [lines, setLines] = useState<SaleLine[]>([{ item: 0, quantity: "1", unit_price: "0" }]);


  const itemMap = useMemo(() => {
    const map = new Map<number, { name: string; sale: string }>();
    for (const item of catalog.data ?? []) map.set(item.id, { name: item.name, sale: item.sale_price });
    return map;
  }, [catalog.data]);

  const subtotal = useMemo(
    () => lines.reduce((s, l) => s + Number(l.quantity || 0) * Number(l.unit_price || 0), 0),
    [lines]
  );
  const taxRateValue = taxRate === "" ? 0 : Number(taxRate);
  const taxAmountValue = subtotal * (taxRateValue / 100);
  const total = subtotal + taxAmountValue;  
  const filteredSavedInvoices = useMemo(() => {
    const allInvoices = invoices.data ?? [];
    if (!savedInvoiceDateFilter) return allInvoices;
    return allInvoices.filter((inv) => inv.issue_date === savedInvoiceDateFilter);
  }, [invoices.data, savedInvoiceDateFilter]);
  const visibleSavedInvoices = showAllSavedInvoices ? filteredSavedInvoices : filteredSavedInvoices.slice(0, 10);
  const hasMoreSavedInvoices = filteredSavedInvoices.length > 10;

  async function submitSale() {
    let selectedCustomer = customerId ? Number(customerId) : undefined;

    if (mode === "new") {
      const created = await createCustomer.mutateAsync({
        ...newCustomer,
        payment_terms_days: Number(newCustomer.payment_terms_days || 0),
        credit_limit: newCustomer.credit_limit || null,
      });
      selectedCustomer = created.id;
    }

    await recordSale.mutateAsync({
      customer: mode === "existing" ? selectedCustomer : undefined,
      customer_name: mode === "by_name" ? customerName : undefined,
      customer_data: mode === "new" ? newCustomer : undefined,
      invoice_number: invoiceNumber,
      issue_date: issueDate,
      due_date: dueDate || undefined,
      tax_amount: taxAmountValue.toFixed(2),      
      notes,
      items: lines.map((l) => ({ item: Number(l.item), quantity: l.quantity, unit_price: l.unit_price })),
      payment_method: paymentMethod,
      expense_vendor_name: expenseVendorName,
    });

    setInvoiceNumber(`INV-${Date.now()}`);
    setNotes("");
    setTaxRate("");    
  }

  return (
    <DashboardShell
      copy={{
        en: { title: "Sales (Products & Services)", subtitle: "Create sale invoices integrated with customers/expenses/revenue", tags: ["Sales", "Invoices"] },
        ar: { title: "بيع الخدمات والمنتجات", subtitle: "إنشاء بيع متكامل مع العملاء والفواتير والمصروفات والإيرادات", tags: ["مبيعات", "فواتير"] },
      }}
      className="sales-page"
    >
      {({ language }) => (
        <>
          <section className="panel">
            <div className="panel__header"><h2>{language === "ar" ? "العميل" : "Customer"}</h2></div>
            <div className="filters-grid">
              <label className="sales-page__input-group">
                <span>{language === "ar" ? "نوع اختيار العميل" : "Customer selection mode"}</span>
                <select value={mode} onChange={(e) => setMode(e.target.value as "existing" | "new" | "by_name") }>
                  <option value="existing">{language === "ar" ? "اختيار عميل موجود" : "Select existing customer"}</option>
                  <option value="new">{language === "ar" ? "إضافة عميل جديد" : "Add new customer"}</option>
                  <option value="by_name">{language === "ar" ? "اختيار/بحث بالاسم" : "Search by name"}</option>
                </select>
              </label>
              {mode === "existing" ? (
                <label className="sales-page__input-group">
                  <span>{language === "ar" ? "العميل" : "Customer"}</span>
                  <select value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
                    <option value="">{language === "ar" ? "اختر عميل" : "Select customer"}</option>
                    {(customers.data ?? []).map((c) => <option key={c.id} value={c.id}>{c.code} - {c.name}</option>)}
                  </select>
                </label>
              ) : null}
              {mode === "by_name" ? (
                <label className="sales-page__input-group">
                  <span>{language === "ar" ? "اسم العميل" : "Customer name"}</span>
                  <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder={language === "ar" ? "اسم العميل" : "Customer name"} />
                </label>
              ) : null}
              {mode === "new" ? (
                <>
                  <label className="sales-page__input-group"><span>{language === "ar" ? "كود العميل" : "Customer code"}</span><input placeholder={language === "ar" ? "كود العميل" : "Customer code"} value={newCustomer.code} onChange={(e) => setNewCustomer((s) => ({ ...s, code: e.target.value }))} /></label>
                  <label className="sales-page__input-group"><span>{language === "ar" ? "اسم العميل" : "Customer name"}</span><input placeholder={language === "ar" ? "اسم العميل" : "Customer name"} value={newCustomer.name} onChange={(e) => setNewCustomer((s) => ({ ...s, name: e.target.value }))} /></label>
                  <label className="sales-page__input-group"><span>{language === "ar" ? "البريد الإلكتروني" : "Email"}</span><input placeholder={language === "ar" ? "البريد الإلكتروني" : "Email"} value={newCustomer.email} onChange={(e) => setNewCustomer((s) => ({ ...s, email: e.target.value }))} /></label>
                  <label className="sales-page__input-group"><span>{language === "ar" ? "الهاتف" : "Phone"}</span><input placeholder={language === "ar" ? "الهاتف" : "Phone"} value={newCustomer.phone} onChange={(e) => setNewCustomer((s) => ({ ...s, phone: e.target.value }))} /></label>
                  <label className="sales-page__input-group"><span>{language === "ar" ? "العنوان" : "Address"}</span><input placeholder={language === "ar" ? "العنوان" : "Address"} value={newCustomer.address} onChange={(e) => setNewCustomer((s) => ({ ...s, address: e.target.value }))} /></label>
                  <label className="sales-page__input-group"><span>{language === "ar" ? "الحد الائتماني" : "Credit limit"}</span><input placeholder={language === "ar" ? "الحد الائتماني" : "Credit limit"} value={newCustomer.credit_limit} onChange={(e) => setNewCustomer((s) => ({ ...s, credit_limit: e.target.value }))} /></label>
                  <label className="sales-page__input-group"><span>{language === "ar" ? "مدة السداد بالأيام" : "Payment terms days"}</span><input placeholder={language === "ar" ? "مدة السداد بالأيام" : "Payment terms days"} type="number" value={newCustomer.payment_terms_days} onChange={(e) => setNewCustomer((s) => ({ ...s, payment_terms_days: Number(e.target.value) }))} /></label>
                </>
              ) : null}
            </div>            
          </section>

          <section className="panel">
            <div className="panel__header"><h2>{language === "ar" ? "بيانات الفاتورة" : "Invoice details"}</h2></div>
            <div className="filters-grid">
              <label className="sales-page__input-group"><span>{language === "ar" ? "رقم الفاتورة" : "Invoice number"}</span><input value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} placeholder={language === "ar" ? "رقم الفاتورة" : "Invoice number"} /></label>
              <label className="sales-page__input-group"><span>{language === "ar" ? "تاريخ الإصدار" : "Issue date"}</span><input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} /></label>
              <label className="sales-page__input-group"><span>{language === "ar" ? "تاريخ الاستحقاق" : "Due date"}</span><input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></label>
              <label className="sales-page__input-group"><span>{language === "ar" ? "نسبة الضريبة (%)" : "Tax Rate (%)"}</span><input type="number" min="0" step="0.01" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} placeholder={language === "ar" ? "نسبة الضريبة" : "Tax rate"} /></label>
              <label className="sales-page__input-group"><span>{language === "ar" ? "قيمة الضريبة" : "Tax Amount"}</span><input value={taxAmountValue.toFixed(2)} readOnly /></label>              
              <label className="sales-page__input-group"><span>{language === "ar" ? "ملاحظات" : "Notes"}</span><input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={language === "ar" ? "ملاحظات" : "Notes"} /></label>            </div>

            <h3>{language === "ar" ? "بنود الفاتورة" : "Invoice items"}</h3>
            <div className="table-wrapper">
              <table className="data-table">
                <thead><tr><th>{language === "ar" ? "الوصف" : "Description"}</th><th>{language === "ar" ? "الكمية" : "Qty"}</th><th>{language === "ar" ? "سعر الوحدة" : "Unit price"}</th><th>{language === "ar" ? "القيمة" : "Value"}</th></tr></thead>
                <tbody>
                  {lines.map((line, idx) => (
                    <tr key={idx}>
                      <td>
                        <select
                          className="sales-page__table-field"
                          value={line.item || ""}                          
                          onChange={(e) => {
                            const id = Number(e.target.value);
                            setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, item: id, unit_price: itemMap.get(id)?.sale ?? "0" } : l)));
                          }}
                        >
                          <option value="">{language === "ar" ? "اختر منتج/خدمة" : "Select item"}</option>
                          {(catalog.data ?? []).map((it) => <option key={it.id} value={it.id}>{it.name}</option>)}
                        </select>
                      </td>
                      <td><input className="sales-page__table-field" value={line.quantity} onChange={(e) => setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, quantity: e.target.value } : l)))} /></td>
                      <td><input className="sales-page__table-field" value={line.unit_price} onChange={(e) => setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, unit_price: e.target.value } : l)))} /></td>                      
                      <td>{(Number(line.quantity || 0) * Number(line.unit_price || 0)).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button className="action-button" onClick={() => setLines((prev) => [...prev, { item: 0, quantity: "1", unit_price: "0" }])}>{language === "ar" ? "إضافة بند" : "Add line"}</button>

            <div className="sales-page__totals">
              <strong>{language === "ar" ? "الإجمالي الفرعي" : "Subtotal"}</strong>: {subtotal.toFixed(2)} | <strong>{language === "ar" ? "الإجمالي" : "Total"}</strong>: {total.toFixed(2)}
            </div>
          </section>

          <section className="panel">
            <div className="panel__header"><h2>{language === "ar" ? "تكامل المصروف" : "Expense integration"}</h2></div>
            <div className="filters-grid">
              <label className="sales-page__input-group"><span>{language === "ar" ? "طريقة السداد" : "Payment method"}</span><input value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} placeholder={language === "ar" ? "طريقة السداد" : "Payment method"} /></label>
              <label className="sales-page__input-group"><span>{language === "ar" ? "المورد/الجهة" : "Vendor / provider"}</span><input value={expenseVendorName} onChange={(e) => setExpenseVendorName(e.target.value)} placeholder={language === "ar" ? "المورد/الجهة" : "Vendor / provider"} /></label>
            </div>
            <button className="action-button" onClick={submitSale}>{recordSale.isPending ? (language === "ar" ? "جارٍ الحفظ..." : "Saving...") : (language === "ar" ? "تنفيذ البيع" : "Record sale")}</button>
          </section>

          <section className="panel">
            <div className="panel__header">
              <h2>{language === "ar" ? "الفواتير المحفوظة" : "Saved invoices"}</h2>
              <div className="sales-page__saved-filters">
                <label className="sales-page__input-group sales-page__input-group--compact">
                  <span>{language === "ar" ? "فلتر التاريخ" : "Date filter"}</span>
                  <input
                    type="date"
                    value={savedInvoiceDateFilter}
                    onChange={(e) => {
                      setSavedInvoiceDateFilter(e.target.value);
                      setShowAllSavedInvoices(false);
                    }}
                  />
                </label>
              </div>
            </div>
            <div className="table-wrapper"><table className="data-table"><thead><tr><th>#</th><th>{language === "ar" ? "العميل" : "Customer"}</th><th>{language === "ar" ? "التاريخ" : "Issue date"}</th><th>{language === "ar" ? "الإجمالي" : "Total"}</th></tr></thead><tbody>{visibleSavedInvoices.map((inv) => <tr key={inv.id}><td>{inv.invoice_number}</td><td>{inv.customer}</td><td>{inv.issue_date}</td><td>{inv.total_amount}</td></tr>)}</tbody></table></div>
            <div className="sales-page__saved-footer">
              <span className="helper-text">{language === "ar" ? `إجمالي الفواتير: ${filteredSavedInvoices.length}` : `Total invoices: ${filteredSavedInvoices.length}`}</span>
              {hasMoreSavedInvoices ? (
                <button className="table-action" onClick={() => setShowAllSavedInvoices((prev) => !prev)}>
                  {showAllSavedInvoices ? (language === "ar" ? "عرض أقل" : "Show less") : (language === "ar" ? "قراءة المزيد" : "Read more")}
                </button>
              ) : null}
            </div>
          </section>          
        </>
      )}
    </DashboardShell>
  );
}