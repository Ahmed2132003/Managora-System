export type Language = "en" | "ar";

export type ThemeMode = "light" | "dark";

export type Content = {
  brand: string;
  welcome: string;
  subtitle: string;
  searchPlaceholder: string;
  languageLabel: string;
  themeLabel: string;
  navigationLabel: string;
  logoutLabel: string;
  backupNowLabel: string;
  restoreBackupLabel: string;
  dateFromLabel: string;
  dateToLabel: string;
  stats: {
    revenue: string;
    expenses: string;
    netProfit: string;
  };
  activityTitle: string;
  activitySubtitle: string;
  insightsTitle: string;
  insightsSubtitle: string;
  forecastTitle: string;
  forecastSubtitle: string;
  commandCenterTitle: string;
  commandCenterSubtitle: string;
  financeMixTitle: string;
  financeMixSubtitle: string;
  hrHealthTitle: string;
  hrHealthSubtitle: string;
  signalsTitle: string;
  signalsSubtitle: string;
  runwayLabel: string;
  inflowLabel: string;
  outflowLabel: string;
  netExpectedLabel: string;
  overtimeLabel: string;
  absenceLabel: string;
  latenessLabel: string;
  openAlertsLabel: string;
  severityHigh: string;
  severityMedium: string;
  severityLow: string;
  noDataLabel: string;
  generatedLabel: string;
  forecastLabels: {
    invoicesDue: string;
    expectedCollected: string;
    payroll: string;
    recurring: string;
    topCustomer: string;
    topCategory: string;
  };
  footer: string;
  userFallback: string;
  searchResultsTitle: string;
  searchResultsSubtitle: string;
  searchEmptyTitle: string;
  searchEmptySubtitle: string;
  loadingLabel: string;
  nav: Record<string, string>;
};

export type NavLink = {
  path: string;
  label: string;
  icon: string;
  permissions?: string[];
  superuserOnly?: boolean;
  external?: boolean;
};