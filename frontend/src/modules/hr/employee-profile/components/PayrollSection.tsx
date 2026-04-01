import { Button, Group, NumberInput, TextInput } from "@mantine/core";
import { Controller } from "react-hook-form";
import type {
  AttendanceStats,
  MutationLike,
  Option,
  PageContent,
  PayrollAdjustmentPeriod,
  SalaryFormReturn,
} from "../types/employeeProfile.types";
import type { SalaryStructure, SalaryType } from "../../../../shared/hr/hooks";

type PayrollSectionProps = {
  content: PageContent;
  employeeId?: number;
  salaryForm: SalaryFormReturn;
  salaryTypeOptions: Option<SalaryType>[];
  handleSalarySubmit: (values: unknown) => void;
  createSalaryStructureMutation: MutationLike;
  updateSalaryStructureMutation: MutationLike;
  dailyRateLabel: string;
  attendanceStats: AttendanceStats;
  bonusTotal: number;
  deductionTotal: number;
  advanceTotal: number;
  commissionTotal: number;
  netPayLabel: string;
  salaryTypeValue?: SalaryType | "";
  adjustmentType: "bonus" | "deduction" | "advance";
  setAdjustmentType: (value: "bonus" | "deduction" | "advance") => void;
  adjustmentName: string;
  setAdjustmentName: (value: string) => void;
  adjustmentAmount: number;
  setAdjustmentAmount: (value: number) => void;
  adjustmentPeriodId: number | null;
  setAdjustmentPeriodId: (value: number | null) => void;
  availableAdjustmentPeriods: PayrollAdjustmentPeriod[];
  advanceAmount: number;
  setAdvanceAmount: (value: number) => void;
  advanceInstallment: number;
  setAdvanceInstallment: (value: number) => void;
  advanceStartDate: string;
  setAdvanceStartDate: (value: string) => void;
  salaryStructure?: SalaryStructure | null;
  handleAddAdjustment: () => void;
  createSalaryComponentMutation: MutationLike;
  createLoanAdvanceMutation: MutationLike;
};

export function PayrollSection(props: PayrollSectionProps) {
  const { content, employeeId, salaryForm, salaryTypeOptions, handleSalarySubmit, createSalaryStructureMutation, updateSalaryStructureMutation, dailyRateLabel, attendanceStats, bonusTotal, deductionTotal, advanceTotal, commissionTotal, netPayLabel, salaryTypeValue, adjustmentType, setAdjustmentType, adjustmentName, setAdjustmentName, adjustmentAmount, setAdjustmentAmount, adjustmentPeriodId, setAdjustmentPeriodId, availableAdjustmentPeriods, advanceAmount, setAdvanceAmount, advanceInstallment, setAdvanceInstallment, advanceStartDate, setAdvanceStartDate, salaryStructure, handleAddAdjustment, createSalaryComponentMutation, createLoanAdvanceMutation } = props;
  return <>
    <section className="panel employee-profile__subpanel">
      <div className="panel__header"><div><h2>{content.section.payrollTitle}</h2><p>{content.section.payrollSubtitle}</p></div></div>
      {!employeeId && <p className="helper-text">{content.payroll.missingEmployee}</p>}
      <div className="employee-profile__grid">
        <label className="form-field"><span>{content.fields.salaryType}</span><Controller name="salary_type" control={salaryForm.control} render={({ field }) => <select value={field.value ?? ""} onChange={(event) => field.onChange(event.target.value)} disabled={!employeeId}><option value="" disabled>{content.payroll.salaryTypePlaceholder}</option>{salaryTypeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>} /></label>
        <label className="form-field"><span>{content.fields.basicSalary}</span><Controller name="basic_salary" control={salaryForm.control} render={({ field }) => <NumberInput value={typeof field.value === "number" ? field.value : Number(field.value) || 0} onChange={(value) => field.onChange(typeof value === "number" ? value : Number(value) || 0)} min={0} hideControls thousandSeparator="," disabled={!employeeId} />} /></label>
        <label className="form-field"><span>{content.fields.currency}</span><Controller name="currency" control={salaryForm.control} render={({ field }) => <TextInput value={field.value ?? ""} onChange={field.onChange} disabled={!employeeId} />} /></label>
        <label className="form-field"><span>{content.fields.dailyRate}</span><input type="text" value={dailyRateLabel} readOnly /><span className="helper-text">{content.payroll.dailyRateHint}</span></label>
      </div>
      <Group><Button type="button" onClick={salaryForm.handleSubmit(handleSalarySubmit)} disabled={!employeeId} loading={createSalaryStructureMutation.isPending || updateSalaryStructureMutation.isPending}>{content.buttons.savePayroll}</Button></Group>
    </section>
    <section className="panel employee-profile__subpanel"><div className="panel__header"><div><h2>{content.payrollSummary.title}</h2><p>{content.payrollSummary.subtitle}</p></div></div><div className="employee-profile__summary-grid">
      <div className="stat-card"><div className="stat-card__top"><span>{content.payrollSummary.presentDays}</span></div><strong>{attendanceStats.presentDays}</strong></div>
      <div className="stat-card"><div className="stat-card__top"><span>{content.payrollSummary.absentDays}</span></div><strong>{attendanceStats.absentDays}</strong></div>
      <div className="stat-card"><div className="stat-card__top"><span>{content.payrollSummary.lateMinutes}</span></div><strong>{attendanceStats.lateMinutes}</strong></div>
      <div className="stat-card"><div className="stat-card__top"><span>{content.payrollSummary.bonuses}</span></div><strong>{bonusTotal.toFixed(2)}</strong></div>
      <div className="stat-card"><div className="stat-card__top"><span>{content.payrollSummary.deductions}</span></div><strong>{deductionTotal.toFixed(2)}</strong></div>
      <div className="stat-card"><div className="stat-card__top"><span>{content.payrollSummary.advances}</span></div><strong>{advanceTotal.toFixed(2)}</strong></div>
      {salaryTypeValue === "commission" && <div className="stat-card"><div className="stat-card__top"><span>{content.payrollSummary.commissionTotal}</span></div><strong>{commissionTotal.toFixed(2)}</strong></div>}
      <div className="stat-card"><div className="stat-card__top"><span>{content.payrollSummary.payableSalary}</span></div><strong>{netPayLabel}</strong></div>
    </div></section>
    <section className="panel employee-profile__subpanel"><div className="panel__header"><div><h2>{content.adjustments.title}</h2><p>{content.adjustments.subtitle}</p></div></div>
      <div className="employee-profile__grid">
        <label className="form-field"><span>{content.adjustments.typeLabel}</span><select value={adjustmentType} onChange={(event) => setAdjustmentType(event.target.value as "bonus" | "deduction" | "advance")}><option value="bonus">{content.adjustments.bonusType}</option><option value="deduction">{content.adjustments.deductionType}</option><option value="advance">{content.adjustments.advanceType}</option></select></label>
        {adjustmentType !== "advance" ? <>
          <label className="form-field"><span>{content.adjustments.nameLabel}</span><input type="text" placeholder={content.adjustments.namePlaceholder} value={adjustmentName} onChange={(event) => setAdjustmentName(event.target.value)} /></label>
          <label className="form-field"><span>{content.adjustments.amountLabel}</span><input type="number" min={0} placeholder={content.adjustments.amountPlaceholder} value={adjustmentAmount} onChange={(event) => setAdjustmentAmount(Number(event.target.value))} /></label>
          <label className="form-field"><span>{content.adjustments.periodLabel}</span><select value={adjustmentPeriodId ?? ""} onChange={(event) => setAdjustmentPeriodId(event.target.value ? Number(event.target.value) : null)}><option value="">{content.adjustments.periodPlaceholder}</option>{availableAdjustmentPeriods.map((period) => <option key={period.id} value={period.id}>{period.period_type === "monthly" ? `${period.year}-${String(period.month).padStart(2, "0")}` : `${period.start_date} → ${period.end_date}`}</option>)}</select></label>
        </> : <>
          <label className="form-field"><span>{content.adjustments.amountLabel}</span><input type="number" min={0} placeholder={content.adjustments.amountPlaceholder} value={advanceAmount} onChange={(event) => setAdvanceAmount(Number(event.target.value))} /></label>
          <label className="form-field"><span>{content.adjustments.installmentLabel}</span><input type="number" min={0} value={advanceInstallment} onChange={(event) => setAdvanceInstallment(Number(event.target.value))} /></label>
          <label className="form-field"><span>{content.adjustments.startDateLabel}</span><input type="date" value={advanceStartDate} onChange={(event) => setAdvanceStartDate(event.target.value)} /></label>
        </>}
      </div>
      {!salaryStructure?.id && adjustmentType !== "advance" && <p className="helper-text">{content.adjustments.missingSalaryStructure}</p>}
      <div className="employee-profile__actions"><button type="button" className="primary-button" onClick={handleAddAdjustment} disabled={createSalaryComponentMutation.isPending || createLoanAdvanceMutation.isPending}>{content.adjustments.addAction}</button></div>
    </section>
  </>;
}