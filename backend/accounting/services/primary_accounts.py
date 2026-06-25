from accounting.models import Account


def get_or_create_account(company, account_type: str) -> Account:
    """
    يضمن وجود حساب واحد بالضبط من النوع المطلوب (INCOME أو EXPENSE) لكل شركة.
    يعتمد بالكامل على UniqueConstraint(company, type) في الموديل.
    """
    if account_type not in Account.Type.values:
        raise ValueError("Unsupported account type.")

    account, _ = Account.objects.get_or_create(
        company=company,
        type=account_type,
    )
    return account


def get_income_account(company) -> Account:
    return get_or_create_account(company, Account.Type.INCOME)


def get_expense_account(company) -> Account:
    return get_or_create_account(company, Account.Type.EXPENSE)


def ensure_company_accounts(company) -> tuple[Account, Account]:
    """
    يضمن وجود حسابي INCOME و EXPENSE معًا لشركة معينة، ويرجعهما.
    هذه هي الدالة التي يستدعيها الـ signal التلقائي (Phase 3) عند إنشاء
    شركة جديدة، وكذلك setup_templates.apply_accounting كإجراء احترازي.
    عملية idempotent بالكامل (لا تُنشئ تكرارًا عند الاستدعاء المتكرر).
    """
    income = get_income_account(company)
    expense = get_expense_account(company)
    return income, expense