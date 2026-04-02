import { type FormEvent, useMemo, useState } from "react";
import {
  type HRAction,
  useHrActionsQuery,
  usePayrollPeriods,
  useSalaryStructures,
  useUpdateHrActionMutation,
} from "../../../../shared/hr/hooks";
import { defaultFormState, salaryPeriodMap } from "../services/hrActions.constants";
import type { FormState } from "../types/hrActions.types";

export function useHRActionsData(searchTerm: string) {
  const actionsQuery = useHrActionsQuery();
  const payrollPeriodsQuery = usePayrollPeriods();
  const updateActionMutation = useUpdateHrActionMutation();
  const [editingAction, setEditingAction] = useState<HRAction | null>(null);
  const [formState, setFormState] = useState<FormState>(defaultFormState);
  const [errorMessage, setErrorMessage] = useState("");

  const salaryStructuresQuery = useSalaryStructures({
    employeeId: editingAction?.employee.id ?? null,
    enabled: Boolean(editingAction),
  });

  const actions = useMemo(() => actionsQuery.data ?? [], [actionsQuery.data]);
  const payrollPeriods = useMemo(() => payrollPeriodsQuery.data ?? [], [payrollPeriodsQuery.data]);

  const salaryType = useMemo(() => {
    if (!salaryStructuresQuery.data || salaryStructuresQuery.data.length === 0) {
      return null;
    }
    return salaryStructuresQuery.data[0].salary_type;
  }, [salaryStructuresQuery.data]);

  const payrollPeriodType = salaryType ? salaryPeriodMap[salaryType] : null;

  const filteredPayrollPeriods = useMemo(() => {
    if (!payrollPeriodType) {
      return payrollPeriods;
    }
    return payrollPeriods.filter((period) => period.period_type === payrollPeriodType);
  }, [payrollPeriodType, payrollPeriods]);

  const derivedPayrollPeriodId = useMemo(() => {
    if (!editingAction) {
      return formState.payroll_period_id;
    }
    if (filteredPayrollPeriods.length === 0) {
      return "";
    }
    if (
      formState.payroll_period_id &&
      filteredPayrollPeriods.some((period) => String(period.id) === formState.payroll_period_id)
    ) {
      return formState.payroll_period_id;
    }
    const matched = filteredPayrollPeriods.find(
      (period) =>
        period.start_date === editingAction.period_start && period.end_date === editingAction.period_end
    );
    return String(matched?.id ?? filteredPayrollPeriods[0].id);
  }, [editingAction, filteredPayrollPeriods, formState.payroll_period_id]);

  const filteredActions = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) {
      return actions;
    }
    return actions.filter((action) => {
      return (
        action.employee.full_name.toLowerCase().includes(query) ||
        action.rule.name.toLowerCase().includes(query) ||
        action.action_type.toLowerCase().includes(query) ||
        action.reason.toLowerCase().includes(query) ||
        String(action.value).toLowerCase().includes(query)
      );
    });
  }, [actions, searchTerm]);

  const stats = useMemo(() => {
    const warnings = actions.filter((action) => action.action_type === "warning");
    const deductions = actions.filter((action) => action.action_type === "deduction");
    return {
      total: actions.length,
      warnings: warnings.length,
      deductions: deductions.length,
    };
  }, [actions]);

  function openEdit(action: HRAction) {
    setEditingAction(action);
    setFormState({
      action_type: action.action_type,
      value: action.value ?? "",
      reason: action.reason ?? "",
      payroll_period_id: "",
    });
    setErrorMessage("");
  }

  function closeEdit() {
    setEditingAction(null);
    setErrorMessage("");
    setFormState(defaultFormState);
  }

  async function submitEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingAction) {
      return;
    }

    const selectedPeriod =
      filteredPayrollPeriods.find((period) => String(period.id) === derivedPayrollPeriodId) ?? null;

    try {
      await updateActionMutation.mutateAsync({
        id: editingAction.id,
        data: {
          action_type: formState.action_type,
          value: formState.value,
          reason: formState.reason,
          period_start: selectedPeriod?.start_date ?? null,
          period_end: selectedPeriod?.end_date ?? null,
        },
      });
      await actionsQuery.refetch();
      closeEdit();
    } catch (error) {
      setErrorMessage(String(error));
    }
  }

  return {
    actionsQuery,
    payrollPeriodsQuery,
    updateActionMutation,
    actions,
    filteredActions,
    stats,
    editingAction,
    formState,
    setFormState,
    filteredPayrollPeriods,
    derivedPayrollPeriodId,
    errorMessage,
    openEdit,
    closeEdit,
    submitEdit,
  };
}