export type Language = "en" | "ar";
export type ThemeMode = "light" | "dark";

export type LoginContent = {
  brand: string;
  subtitle: string;
  languageLabel: string;
  themeLabel: string;
  footer: string;
  welcome: string;
  heroTitle: string;
  heroSubtitle: string;
  formTitle: string;
  formSubtitle: string;
  usernameLabel: string;
  passwordLabel: string;
  loginLabel: string;
  helperText: string;
  subscriptionTitle: string;
  subscriptionSummary: string;
  purchasePrice: string;
  maintenancePrice: string;
  paymentCodeLabel: string;
  activationUsernameLabel: string;
  subscribeNowLabel: string;
  subscriptionHint: string;
};

export const loginContentMap: Record<Language, LoginContent> = {
  en: {
    brand: "managora",
    subtitle: "A smart dashboard that blends motion, clarity, and insight.",
    languageLabel: "Language",
    themeLabel: "Theme",
    footer: "This system is produced by Creativity Code.",
    welcome: "Welcome back",
    heroTitle: "Welcome to the world that will run your company.",
    heroSubtitle: "Welcome to Managora.",
    formTitle: "Attendance check-in",
    formSubtitle: "Use your work credentials to check in.",
    usernameLabel: "Username",
    passwordLabel: "Password",
    loginLabel: "Check in",
    helperText: "Need help? Contact your administrator.",
    subscriptionTitle: "Subscribe now",
    subscriptionSummary:
      "Managora connects HR, accounting, attendance, and analytics in one system to run your company smoothly.",
    purchasePrice: "Purchase price: 7000 EGP",
    maintenancePrice: "Maintenance & hosting: 600 EGP every 3 months",
    paymentCodeLabel: "Payment code",
    activationUsernameLabel: "Username for activation",
    subscribeNowLabel: "Subscribe now",
    subscriptionHint:
      "Enter your username and 24-hour payment code to activate all accounts for your company.",
  },
  ar: {
    brand: "ماناجورا",
    subtitle: "لوحة ذكية تجمع الحركة والوضوح والرؤية التحليلية.",
    languageLabel: "اللغة",
    themeLabel: "المظهر",
    footer: "هذا السيستم من انتاج كريتفيتي كود",
    welcome: "أهلًا بعودتك",
    heroTitle: "اهلا في العالم الذي سيدير شركتك",
    heroSubtitle: "اهلا في مانجورا managora",
    formTitle: "تسجيل الحضور",
    formSubtitle: "استخدم بيانات العمل لتسجيل حضورك.",
    usernameLabel: "اسم المستخدم",
    passwordLabel: "كلمة المرور",
    loginLabel: "تسجيل حضور",
    helperText: "هل تحتاج للمساعدة؟ تواصل مع مسؤول النظام.",
    subscriptionTitle: "اشترك الآن",
    subscriptionSummary:
      "ماناجورا نظام موحد لإدارة الموارد البشرية والمحاسبة والحضور والتحليلات لتشغيل شركتك بكفاءة.",
    purchasePrice: "سعر الشراء: 7000 جنيه",
    maintenancePrice: "الصيانة والاستضافة: 600 جنيه كل 3 شهور",
    paymentCodeLabel: "كود الدفع",
    activationUsernameLabel: "اسم المستخدم للتفعيل",
    subscribeNowLabel: "اشترك الآن",
    subscriptionHint:
      "اكتب اسم المستخدم وكود الدفع الصالح لمدة 24 ساعة لتفعيل كل حسابات شركتك فورًا.",
  },
};