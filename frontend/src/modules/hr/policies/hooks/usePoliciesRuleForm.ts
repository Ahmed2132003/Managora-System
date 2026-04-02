import { useMemo, useState } from "react";
import type { PolicyRule } from "../../../../shared/hr/hooks";
import { templateOptions } from "../services/policies.content";

export function usePoliciesRuleForm() {
  const [template, setTemplate] = useState<PolicyRule["rule_type"] | null>("late_over_minutes");
  const [threshold, setThreshold] = useState<number | undefined>(5);
  const [periodDays, setPeriodDays] = useState<number | null>(30);
  const [actionType, setActionType] = useState<PolicyRule["action_type"]>("warning");
  const [actionValue, setActionValue] = useState<number | undefined>(undefined);
  const [isActive, setIsActive] = useState(true);
  const [ruleName, setRuleName] = useState("");

  const activeTemplate = useMemo(
    () => templateOptions.find((option) => option.value === template),
    [template]
  );

  const autoName = useMemo(() => {
    if (!template) return "";
    switch (template) {
      case "late_over_minutes":
        return `Late > ${threshold ?? 0} minutes`;
      case "late_count_over_period":
        return `Late > ${threshold ?? 0} times in ${periodDays ?? 0} days`;
      case "absent_count_over_period":
        return `Absent > ${threshold ?? 0} times in ${periodDays ?? 0} days`;
      default:
        return "";
    }
  }, [template, threshold, periodDays]);

  function resetForm() {
    setRuleName("");
    setThreshold(5);
    setPeriodDays(30);
    setActionType("warning");
    setActionValue(undefined);
    setIsActive(true);
  }

  return {
    template,
    setTemplate,
    threshold,
    setThreshold,
    periodDays,
    setPeriodDays,
    actionType,
    setActionType,
    actionValue,
    setActionValue,
    isActive,
    setIsActive,
    ruleName,
    setRuleName,
    autoName,
    activeTemplate,
    resetForm,
  };
}