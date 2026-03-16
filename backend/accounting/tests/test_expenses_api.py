from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from accounting.models import Account, Expense, JournalEntry
from core.models import Company, Permission, Role, RolePermission, UserRole

User = get_user_model()


class ExpenseApiTests(APITestCase):
    def setUp(self):
        self.company = Company.objects.create(name="Company A")
        self.accountant = User.objects.create_user(
            username="accountant",
            password="pass12345",
            company=self.company,
        )
        self.employee = User.objects.create_user(
            username="employee",
            password="pass12345",
            company=self.company,
        )

        self.accountant_role, _ = Role.objects.get_or_create(company=self.company, name="Accountant")
        self.employee_role, _ = Role.objects.get_or_create(company=self.company, name="Employee")
        UserRole.objects.get_or_create(user=self.accountant, role=self.accountant_role)
        UserRole.objects.get_or_create(user=self.employee, role=self.employee_role)

        self.permissions = {
            code: Permission.objects.create(code=code, name=code)
            for code in ["expenses.view", "expenses.create", "expenses.approve"]
        }
        RolePermission.objects.get_or_create(            
            role=self.accountant_role, permission=self.permissions["expenses.view"]
        )
        RolePermission.objects.get_or_create(            
            role=self.accountant_role, permission=self.permissions["expenses.create"]
        )
        RolePermission.objects.get_or_create(            
            role=self.accountant_role, permission=self.permissions["expenses.approve"]
        )
        RolePermission.objects.get_or_create(            
            role=self.employee_role, permission=self.permissions["expenses.create"]
        )

        self.cash = Account.objects.create(
            company=self.company,
            code="1000",
            name="Cash",
            type=Account.Type.ASSET,
        )
        self.expense_account = Account.objects.create(
            company=self.company,
            code="5100",
            name="Operating Expenses",
            type=Account.Type.EXPENSE,
        )

    def auth(self, username):
        url = reverse("token_obtain_pair")
        res = self.client.post(
            url, {"username": username, "password": "pass12345"}, format="json"
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {res.data['access']}")

    def test_create_approved_expense_posts_journal(self):
        self.auth("accountant")
        url = reverse("expense-list")
        res = self.client.post(
            url,
            {
                "date": "2024-02-01",
                "amount": "250.00",
                "expense_account": self.expense_account.id,
                "paid_from_account": self.cash.id,
                "vendor_name": "Office Supplies",
                "notes": "Printer ink",
                "status": "approved",
            },
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        expense = Expense.objects.get(id=res.data["id"])
        entry = JournalEntry.objects.get(
            company=self.company,
            reference_type=JournalEntry.ReferenceType.EXPENSE,
            reference_id=str(expense.id),
        )
        self.assertEqual(entry.lines.count(), 2)
        total_debit = sum(line.debit for line in entry.lines.all())
        total_credit = sum(line.credit for line in entry.lines.all())
        self.assertEqual(total_debit, total_credit)

    def test_approve_twice_does_not_duplicate_journal(self):
        self.auth("accountant")
        expense = Expense.objects.create(
            company=self.company,
            date="2024-02-02",
            amount="100.00",
            expense_account=self.expense_account,
            paid_from_account=self.cash,
            status=Expense.Status.DRAFT,
            created_by=self.accountant,
        )
        approve_url = reverse("expense-approve", args=[expense.id])
        res = self.client.post(approve_url, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        res = self.client.post(approve_url, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            JournalEntry.objects.filter(
                company=self.company,
                reference_type=JournalEntry.ReferenceType.EXPENSE,
                reference_id=str(expense.id),
            ).count(),
            1,
        )

    def test_employee_can_only_create_draft(self):
        self.auth("employee")
        url = reverse("expense-list")
        res = self.client.post(
            url,
            {
                "date": "2024-02-03",
                "amount": "80.00",
                "expense_account": self.expense_account.id,
                "paid_from_account": self.cash.id,
                "status": "approved",
            },
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

        res = self.client.post(
            url,
            {
                "date": "2024-02-03",
                "amount": "80.00",
                "expense_account": self.expense_account.id,
                "paid_from_account": self.cash.id,
                "status": "draft",
            },
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)