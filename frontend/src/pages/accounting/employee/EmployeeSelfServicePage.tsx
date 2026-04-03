import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { notifications } from "@mantine/notifications";
import { useQueries } from "@tanstack/react-query";

import { DashboardShell } from "../../DashboardShell";
import {
  useDeleteEmployeeDocument,
  useMyEmployeeDocuments,
  useMyPayrollRuns,
  type AttendanceRecord,
  type PayrollRunDetail,
  useAttendanceRecordsQuery,
  useUploadMyEmployeeDocument,
  type DocumentCategory,
} from "../../../shared/hr/hooks";
import { http } from "../../../shared/api/http";
import { endpoints } from "../../../shared/api/endpoints";
import { useMe } from "../../../shared/auth/useMe";
import "./EmployeeSelfServicePage.css";

type Language = "en" | "ar";

type Copy = Record<
  Language,
  {
    title: string;
    subtitle: string;
    helper: string;
    sections: {
      payroll: string;
      leaves: string;
      attendance: string;
      documents: string;
    };
    actions: {
      requestLeave: string;
      viewMyRequests: string;
      viewAttendance: string;
      upload: string;
      uploading: string;
      delete: string;
      viewPayslip: string;
    };
    labels: {
      status: string;
      net: string;
      emptyPayroll: string;
      emptyDocuments: string;
      docType: string;
      docTitle: string;
      file: string;
      uploadDocument: string;
    };    
    notifications: {
      uploadSuccess: string;
      uploadError: string;
      deleteSuccess: string;
      deleteError: string;
    };
  }
>;

const pageCopy: Copy = {
  en: {
    title: "Employee Self Service",
    subtitle: "Manage payroll, leaves, documents, and attendance in one place.",
    helper: "For all employees",
    sections: {
      payroll: "My Salary",
      leaves: "Leave Request",
      attendance: "Attendance",
      documents: "My Documents",
    },
    actions: {
      requestLeave: "Create Leave Request",
      viewMyRequests: "View My Requests",
      viewAttendance: "View My Attendance",
      upload: "Upload Document",
      uploading: "Uploading...",
      delete: "Delete",
      viewPayslip: "View Payslip",
    },
    labels: {
      status: "Status",
      net: "Total Due",
      emptyPayroll: "No payroll runs yet.",
      emptyDocuments: "No uploaded documents yet.",
      docType: "Document Type",
      docTitle: "Title",
      file: "File",
      uploadDocument: "Upload employee document",
    },    
    notifications: {
      uploadSuccess: "Document uploaded successfully.",
      uploadError: "Failed to upload document.",
      deleteSuccess: "Document deleted.",
      deleteError: "Failed to delete document.",
    },
  },
  ar: {
    title: "بوابة الخدمات الذاتية للموظف",
    subtitle: "تابع الراتب والإجازات والمستندات والحضور من مكان واحد.",
    helper: "متاحة لجميع الموظفين",
    sections: {
      payroll: "راتبي",
      leaves: "طلب إجازة",
      attendance: "الحضور",
      documents: "مستنداتي",
    },
    actions: {
      requestLeave: "إنشاء طلب إجازة",
      viewMyRequests: "عرض طلباتي",
      viewAttendance: "عرض حضوري",
      upload: "رفع مستند",
      uploading: "جاري الرفع...",
      delete: "حذف",
      viewPayslip: "عرض القسيمة",
    },
    labels: {
      status: "الحالة",
      net: "الإجمالي المستحق",
      emptyPayroll: "لا توجد مسيرات رواتب حتى الآن.",
      emptyDocuments: "لا توجد مستندات مرفوعة.",
      docType: "نوع المستند",
      docTitle: "العنوان",
      file: "الملف",
      uploadDocument: "رفع مستند الموظف",
    },    
    notifications: {
      uploadSuccess: "تم رفع المستند بنجاح.",
      uploadError: "فشل رفع المستند.",
      deleteSuccess: "تم حذف المستند.",
      deleteError: "فشل حذف المستند.",
    },
  },
};

export function EmployeeSelfServicePage() {
  const [expandedRunId, setExpandedRunId] = useState<number | null>(null);
  const [runPayables, setRunPayables] = useState<Record<number, number>>({});
  const [hrName, setHrName] = useState("-");
  const runsQuery = useMyPayrollRuns();
  const meQuery = useMe();
  const runDetailsQueries = useQueries({
    queries: (runsQuery.data ?? []).map((run) => ({
      queryKey: ["payroll", "runs", run.id, "self-service"],
      queryFn: async () => {
        const response = await http.get<PayrollRunDetail>(
          endpoints.hr.payrollRun(run.id),
        );
        return response.data;
      },
      enabled: runsQuery.isSuccess,
    })),
  });
  const docsQuery = useMyEmployeeDocuments();
  const uploadMutation = useUploadMyEmployeeDocument();
  const deleteMutation = useDeleteEmployeeDocument();

  const [docType, setDocType] = useState("other");
  const [docCategory, setDocCategory] = useState<DocumentCategory>("employee_file");
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const expandedRunDetails = useMemo(
    () =>
      expandedRunId != null
        ? runDetailsQueries
            .map((query) => query.data)
            .find((run): run is PayrollRunDetail => run?.id === expandedRunId) ?? null
        : null,
    [expandedRunId, runDetailsQueries],
  );

  const expandedRunRange = useMemo(() => {
    const dateFrom = expandedRunDetails?.period?.start_date;
    const dateTo = expandedRunDetails?.period?.end_date;
    if (!dateFrom || !dateTo) {
      return null;
    }
    const start = new Date(dateFrom);
    const end = new Date(dateTo);
    const days = Math.max(
      Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1,
      1,
    );
    return { dateFrom, dateTo, days };
  }, [expandedRunDetails]);

  const attendanceQuery = useAttendanceRecordsQuery(
    {
      dateFrom: expandedRunRange?.dateFrom,
      dateTo: expandedRunRange?.dateTo,
      employeeId: expandedRunDetails?.employee?.id
        ? String(expandedRunDetails.employee.id)
        : undefined,
    },
    Boolean(expandedRunDetails?.employee?.id && expandedRunRange),
  );

  async function handleUpload(copy: Copy[Language]) {
    if (!file) return;
    try {
      await uploadMutation.mutateAsync({
        doc_type: docType,
        category: docCategory,
        title,
        file,
      });
      setTitle("");
      setFile(null);
      await docsQuery.refetch();
      notifications.show({
        color: "teal",
        message: copy.notifications.uploadSuccess,
      });
    } catch {
      notifications.show({
        color: "red",
        message: copy.notifications.uploadError,
      });
    }
  }

  async function handleDelete(id: number, copy: Copy[Language]) {
    try {
      await deleteMutation.mutateAsync(id);
      await docsQuery.refetch();
      notifications.show({
        color: "teal",
        message: copy.notifications.deleteSuccess,
      });
    } catch {
      notifications.show({
        color: "red",
        message: copy.notifications.deleteError,
      });
    }
  }

  function parseAmount(value: unknown) {
    if (typeof value === "number") return value;
    if (typeof value === "string" && value.trim() !== "") {
      const parsed = Number(value);
      return Number.isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  }

  function formatMoney(value: unknown) {
    return parseAmount(value).toFixed(2);
  }

  function resolveDailyRateByPeriod(
    periodType: "monthly" | "weekly" | "daily" | undefined,
    basicSalary: number,
  ) {
    if (!basicSalary) return null;
    if (periodType === "daily") return basicSalary;
    if (periodType === "weekly") return basicSalary / 7;
    return basicSalary / 30;
  }

  function buildRunSummary(
    run: PayrollRunDetail | null | undefined,
    attendanceRecords: AttendanceRecord[],
    periodRange: { dateFrom: string; dateTo: string; days: number } | null,
  ) {
    if (!run || !periodRange) {
      return null;
    }

    const records = attendanceRecords ?? [];
    const presentDays = records.filter((record) => record.status !== "absent").length;
    const absentDays = Math.max(periodRange.days - presentDays, 0);
    const lateMinutes = records.reduce(
      (sum, record) => sum + (record.late_minutes ?? 0),
      0,
    );
    const lines = run.lines ?? [];
    const basicLine = lines.find((line) => line.code.toUpperCase() === "BASIC");
    const basicAmount = basicLine ? parseAmount(basicLine.amount) : 0;
    const metaRate = basicLine?.meta?.rate;
    const dailyRate = metaRate
      ? parseAmount(metaRate)
      : resolveDailyRateByPeriod(run.period.period_type, basicAmount);

    const bonuses = lines
      .filter(
        (line) =>
          line.type === "earning" &&
          line.code.toUpperCase() !== "BASIC" &&
          !line.code.toUpperCase().startsWith("COMM-"),
      )
      .reduce((sum, line) => sum + parseAmount(line.amount), 0);
    const commissions = lines
      .filter((line) => line.type === "earning" && line.code.toUpperCase().startsWith("COMM-"))
      .reduce((sum, line) => sum + parseAmount(line.amount), 0);
    const deductions = lines
      .filter(
        (line) => line.type === "deduction" && !line.code.toUpperCase().startsWith("LOAN-"),
      )
      .reduce((sum, line) => sum + parseAmount(line.amount), 0);
    const advances = lines
      .filter((line) => line.type === "deduction" && line.code.toUpperCase().startsWith("LOAN-"))
      .reduce((sum, line) => sum + parseAmount(line.amount), 0);

    return {
      presentDays,
      absentDays,
      lateMinutes,
      bonuses,
      commissions,
      deductions,
      advances,
      dailyRate: dailyRate ?? 0,
    };
  }

  function calculatePayableTotal(summary: ReturnType<typeof buildRunSummary>) {
    if (!summary) return null;
    return (
      summary.presentDays * summary.dailyRate +
      summary.bonuses +
      summary.commissions -
      summary.deductions -
      summary.advances
    );
  }

  const expandedRunSummary = useMemo(
    () => buildRunSummary(expandedRunDetails, attendanceQuery.data ?? [], expandedRunRange),
    [attendanceQuery.data, expandedRunDetails, expandedRunRange],
  );
  const expandedRunPayable = useMemo(() => {
    const calculated = calculatePayableTotal(expandedRunSummary);
    return calculated ?? parseAmount(expandedRunDetails?.net_total ?? 0);
  }, [expandedRunDetails?.net_total, expandedRunSummary]);

  const currentUserName = useMemo(() => {
    const user = meQuery.data?.user;
    if (!user) {
      return "-";
    }
    const fullName = `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim();
    return fullName || user.username || "-";
  }, [meQuery.data?.user]);

  const roleNames = useMemo(() => {
    const currentRoles = meQuery.data?.roles ?? [];
    return currentRoles.map((role) => (role.slug || role.name).toLowerCase());
  }, [meQuery.data?.roles]);

  const isSuperUser = meQuery.data?.user.is_superuser ?? false;
  const managerName = roleNames.includes("manager") || isSuperUser ? currentUserName : "-";

  useEffect(() => {
    const runs = runsQuery.data ?? [];
    const missingRuns = runs.filter((run) => runPayables[run.id] == null);
    if (missingRuns.length === 0) return;

    let cancelled = false;
    async function loadPayables() {
      const results = await Promise.all(
        missingRuns.map(async (run) => {
          try {
            const details = runDetailsQueries
              .map((query) => query.data)
              .find((item): item is PayrollRunDetail => item?.id === run.id);
            if (!details) {
              return null;
            }
            if (!details.period?.start_date || !details.period?.end_date) {
              return { id: run.id, payable: parseAmount(details.net_total ?? run.net_total) };
            }
            const attendanceResponse = await http.get<AttendanceRecord[]>(
              endpoints.hr.attendanceRecords,
              {                
                params: {
                  date_from: details.period.start_date,
                  date_to: details.period.end_date,
                  employee_id: run.employee.id,
                },
              },
            );
            const start = new Date(details.period.start_date);
            const end = new Date(details.period.end_date);
            const periodRange = {
              dateFrom: details.period.start_date,
              dateTo: details.period.end_date,
              days: Math.max(
                Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1,
                1,
              ),
            };
            const summary = buildRunSummary(details, attendanceResponse.data ?? [], periodRange);
            const calculated = calculatePayableTotal(summary);
            return {
              id: run.id,
              payable: calculated ?? parseAmount(details.net_total ?? run.net_total),
            };
          } catch {
            return { id: run.id, payable: parseAmount(run.net_total) };
          }
        }),
      );

      if (cancelled) return;
      setRunPayables((prev) => {
        const next = { ...prev };
        results.forEach((result) => {
          if (!result) {
            return;
          }
          next[result.id] = result.payable;
        });
        return next;
      });      
    }

    loadPayables();
    return () => {
      cancelled = true;
    };
  }, [runDetailsQueries, runPayables, runsQuery.data]);

  useEffect(() => {
    let cancelled = false;

    async function loadHrUser() {
      try {
        const response = await http.get<
          {
            id: number;
            username: string;
            first_name?: string | null;
            last_name?: string | null;
            roles?: { name?: string | null; slug?: string | null }[];
          }[]
        >(endpoints.users);
        const users = response.data ?? [];
        const hrUser = users.find((user) =>
          (user.roles ?? []).some(
            (role) => (role.slug || role.name || "").toLowerCase() === "hr",
          ),
        );
        if (!cancelled) {
          const first = hrUser?.first_name?.trim() ?? "";
          const last = hrUser?.last_name?.trim() ?? "";
          const fullName = `${first} ${last}`.trim();
          setHrName(fullName || hrUser?.username || "-");
        }
      } catch {
        if (!cancelled) {
          setHrName("-");
        }
      }
    }

    loadHrUser();
    return () => {
      cancelled = true;
    };
  }, []);

  function getRunNetTotal(
    runId: number,
    fallback: string,
    expandedPayable: number | null,
  ) {
    // Keep Profile "Total Due" aligned with the exact payable source used by the payslip preview:
    // 1) expanded payslip computed payable, 2) cached per-run payable derived from payslip inputs,
    // 3) payroll-run detail net_total (same payload used by payslip), then final list fallback.
    if (expandedRunId === runId && expandedPayable != null) {
      return expandedPayable;
    }    
    if (runPayables[runId] != null) {
      return runPayables[runId];
    }
    return parseAmount(fallback);
  }

  return (
    <DashboardShell
      copy={{
        en: {
          title: pageCopy.en.title,
          subtitle: pageCopy.en.subtitle,
          helper: pageCopy.en.helper,
        },
        ar: {
          title: pageCopy.ar.title,
          subtitle: pageCopy.ar.subtitle,
          helper: pageCopy.ar.helper,
        },
      }}
      className="employee-self-service"
    >
      {({ language, isArabic }) => {
        const copy = pageCopy[language];
        const runDetailsById = new Map(
          runDetailsQueries
            .map((query) => query.data)
            .filter((run): run is PayrollRunDetail => Boolean(run))
            .map((run) => [run.id, run]),
        );

        return (
          <div
            className="employee-self-service__content"
            dir={isArabic ? "rtl" : "ltr"}
          >
            <section className="panel">
              <div className="panel__header">
                <h2>{copy.sections.payroll}</h2>
              </div>
              {runsQuery.data?.length ? (
                runsQuery.data.map((run) => (
                  <article key={run.id} className="employee-self-service__card">
                    <p>
                      <strong>{copy.labels.status}:</strong> {run.status}
                    </p>
                    <p>
                      <strong>{copy.labels.net}:</strong>{" "}
                      {formatMoney(
                        getRunNetTotal(run.id, run.net_total, expandedRunPayable),
                      )}
                    </p>                    
                    <div className="employee-self-service__actions">
                      <button
                        type="button"
                        className="ghost-button"                        
                        onClick={() =>
                          setExpandedRunId((current) =>
                            current === run.id ? null : run.id,
                          )
                        }
                      >
                        {copy.actions.viewPayslip}
                      </button>
                    </div>
                    {expandedRunId === run.id && runDetailsById.get(run.id) && (
                      <div className="employee-self-service__payslip-preview">
                        <div className="payroll-period-details__detail-summary">
                          <div>
                            <span className="helper-text">
                              {language === "ar" ? "الأساسي" : "Basic"}
                            </span>
                            <strong>
                              {formatMoney(
                                runDetailsById
                                  .get(run.id)
                                  ?.lines.find((line) => line.code.toUpperCase() === "BASIC")
                                  ?.amount ?? run.earnings_total,
                              )}
                            </strong>
                          </div>
                          <div>
                            <span className="helper-text">{copy.labels.net}</span>
                            <strong>{formatMoney(expandedRunPayable)}</strong>
                          </div>
                        </div>
                        {expandedRunSummary && (
                          <div className="payroll-period-details__summary-grid">
                            <div>
                              <span className="helper-text">
                                {language === "ar" ? "أيام الحضور" : "Attendance days"}
                              </span>
                              <strong>{expandedRunSummary.presentDays}</strong>
                            </div>
                            <div>
                              <span className="helper-text">
                                {language === "ar" ? "أيام الغياب" : "Absence days"}
                              </span>
                              <strong>{expandedRunSummary.absentDays}</strong>
                            </div>
                            <div>
                              <span className="helper-text">
                                {language === "ar" ? "دقائق التأخير" : "Late minutes"}
                              </span>
                              <strong>{expandedRunSummary.lateMinutes}</strong>
                            </div>
                            <div>
                              <span className="helper-text">
                                {language === "ar" ? "المكافآت" : "Bonuses"}
                              </span>
                              <strong>{formatMoney(expandedRunSummary.bonuses)}</strong>
                            </div>
                            <div>
                              <span className="helper-text">
                                {language === "ar" ? "العمولات" : "Commissions"}
                              </span>
                              <strong>{formatMoney(expandedRunSummary.commissions)}</strong>
                            </div>
                            <div>
                              <span className="helper-text">
                                {language === "ar" ? "الخصومات" : "Deductions"}
                              </span>
                              <strong>{formatMoney(expandedRunSummary.deductions)}</strong>
                            </div>
                            <div>
                              <span className="helper-text">
                                {language === "ar" ? "السلف" : "Advances"}
                              </span>
                              <strong>{formatMoney(expandedRunSummary.advances)}</strong>
                            </div>
                            <div>
                              <span className="helper-text">{copy.labels.net}</span>
                              <strong>{formatMoney(expandedRunPayable)}</strong>
                            </div>
                          </div>
                        )}
                        <div className="table-wrapper">
                          <table className="data-table">
                            <thead>
                              <tr>
                                <th>{language === "ar" ? "البند" : "Line"}</th>
                                <th>{language === "ar" ? "النوع" : "Type"}</th>
                                <th>{language === "ar" ? "القيمة" : "Amount"}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {runDetailsById.get(run.id)?.lines.map((line) => (
                                <tr key={line.id}>
                                  <td>{line.name}</td>
                                  <td>{line.type}</td>
                                  <td>{formatMoney(line.amount)}</td>
                                </tr>
                              ))}
                              <tr>
                                <td colSpan={2}>
                                  <strong>{copy.labels.net}</strong>
                                </td>
                                <td>
                                  <strong>
                                    {formatMoney(expandedRunPayable)}
                                  </strong>
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                        <div className="payroll-period-details__footer-grid">
                          <div>
                            <span className="helper-text">
                              {language === "ar" ? "الشركة" : "Company"}
                            </span>
                            <strong>{meQuery.data?.company.name ?? "-"}</strong>
                          </div>
                          <div>
                            <span className="helper-text">
                              {language === "ar" ? "المدير" : "Manager"}
                            </span>
                            <strong>{managerName}</strong>
                          </div>
                          <div>
                            <span className="helper-text">
                              {language === "ar" ? "الموارد البشرية" : "HR"}
                            </span>
                            <strong>{hrName}</strong>
                          </div>
                        </div>
                      </div>
                    )}
                  </article>
                ))                
              ) : (
                <p className="helper-text">{copy.labels.emptyPayroll}</p>
              )}
            </section>

            <section className="panel employee-self-service__shortcuts">
              <div className="panel__header">
                <h2>{copy.sections.leaves}</h2>
              </div>
              <Link className="primary-button" to="/leaves/request">              
                {copy.actions.requestLeave}
              </Link>
              <Link className="ghost-button" to="/leaves/my">
                {copy.actions.viewMyRequests}
              </Link>
              <div className="panel__header">
                <h2>{copy.sections.attendance}</h2>
              </div>
              <Link className="ghost-button" to="/attendance/self">              
                {copy.actions.viewAttendance}
              </Link>
            </section>

            <section className="panel">
              <div className="panel__header">
                <h2>{copy.sections.documents}</h2>
              </div>
              <div className="employee-self-service__upload">
                <label className="form-field">
                  <span>{copy.labels.docType}</span>
                  <input
                    value={docType}
                    onChange={(event) => setDocType(event.target.value)}
                    placeholder={copy.labels.docType}
                  />
                </label>
                <label className="form-field">
                  <span>{language === "ar" ? "التصنيف" : "Category"}</span>
                  <select
                    value={docCategory}
                    onChange={(event) => setDocCategory(event.target.value as DocumentCategory)}
                  >
                    <option value="employee_file">{language === "ar" ? "ملف موظف" : "Employee file"}</option>
                    <option value="contract">{language === "ar" ? "عقد" : "Contract"}</option>
                    <option value="invoice">{language === "ar" ? "فاتورة" : "Invoice"}</option>
                    <option value="other">{language === "ar" ? "أخرى" : "Other"}</option>
                  </select>
                </label>
                <label className="form-field">
                  <span>{copy.labels.docTitle}</span>
                  <input
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder={copy.labels.docTitle}
                  />
                </label>
                <label className="form-field">
                  <span>{copy.labels.uploadDocument}</span>
                  <input
                    type="file"
                    onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                  />
                </label>
                <button
                  className="primary-button"                               
                  type="button"
                  disabled={!file || uploadMutation.isPending}
                  onClick={() => handleUpload(copy)}
                >
                  {uploadMutation.isPending
                    ? copy.actions.uploading
                    : copy.actions.upload}
                </button>
              </div>
              {docsQuery.data?.length ? (
                docsQuery.data.map((doc) => (
                  <article key={doc.id} className="employee-self-service__card">
                    <p>
                      <strong>{copy.labels.docType}:</strong> {doc.doc_type}
                    </p>
                    <p>
                      <strong>{copy.labels.docTitle}:</strong>{" "}
                      {doc.title || "-"}
                    </p>
                    <div className="employee-self-service__actions">
                      <a
                        className="ghost-button"
                        href={endpoints.hr.documentDownload(doc.id)}
                        target="_blank"
                        rel="noreferrer"                        
                      >
                        {copy.labels.file}
                      </a>
                      <button
                        type="button"
                        className="ghost-button"                        
                        onClick={() => handleDelete(doc.id, copy)}
                      >
                        {copy.actions.delete}
                      </button>
                    </div>
                  </article>
                ))
              ) : (
                <p className="helper-text">{copy.labels.emptyDocuments}</p>
              )}
            </section>
          </div>
        );
      }}
    </DashboardShell>
  );
}