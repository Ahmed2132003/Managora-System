from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from accounting.models import Account, JournalEntry
from core.models import Company, Permission, Role, RolePermission, UserRole

User = get_user_model()


class JournalEntryApiTests(APITestCase):
    def setUp(self):
        self.company_a = Company.objects.create(name="Company A")
        self.company_b = Company.objects.create(name="Company B")

        self.accountant = User.objects.create_user(
            username="accountant",
            password="pass12345",
            company=self.company_a,
        )
        self.hr = User.objects.create_user(
            username="hr",
            password="pass12345",
            company=self.company_a,
        )

        self.accountant_role, _ = Role.objects.get_or_create(company=self.company_a, name="Accountant")
        self.hr_role, _ = Role.objects.get_or_create(company=self.company_a, name="HR")
        UserRole.objects.get_or_create(user=self.accountant, role=self.accountant_role)
        UserRole.objects.get_or_create(user=self.hr, role=self.hr_role)

        self.permissions = {
            code: Permission.objects.create(code=code, name=code)
            for code in [
                "accounting.journal.view",
                "accounting.journal.post",
            ]
        }
        RolePermission.objects.get_or_create(            
            role=self.accountant_role, permission=self.permissions["accounting.journal.view"]
        )
        RolePermission.objects.get_or_create(            
            role=self.accountant_role, permission=self.permissions["accounting.journal.post"]
        )

        self.cash = Account.objects.create(
            company=self.company_a,
            code="1000",
            name="Cash",
            type=Account.Type.ASSET,
        )
        self.revenue = Account.objects.create(
            company=self.company_a,
            code="4000",
            name="Revenue",
            type=Account.Type.INCOME,
        )
        self.other_company_account = Account.objects.create(
            company=self.company_b,
            code="2000",
            name="Other",
            type=Account.Type.ASSET,
        )

    def auth(self, username):
        url = reverse("token_obtain_pair")
        res = self.client.post(
            url, {"username": username, "password": "pass12345"}, format="json"
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {res.data['access']}")

    def test_unbalanced_entry_returns_400(self):
        self.auth("accountant")
        url = reverse("journal-entry-list")
        res = self.client.post(
            url,
            {
                "date": "2024-01-01",
                "memo": "Unbalanced",
                "lines": [
                    {"account_id": self.cash.id, "debit": "100.00", "credit": "0"},
                    {"account_id": self.revenue.id, "debit": "0", "credit": "90.00"},
                ],
            },
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(JournalEntry.objects.count(), 0)

    def test_balanced_entry_creates_lines(self):
        self.auth("accountant")
        url = reverse("journal-entry-list")
        res = self.client.post(
            url,
            {
                "date": "2024-01-02",
                "memo": "Balanced",
                "lines": [
                    {"account_id": self.cash.id, "debit": "100.00", "credit": "0"},
                    {"account_id": self.revenue.id, "debit": "0", "credit": "100.00"},
                ],
            },
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        entry = JournalEntry.objects.get(id=res.data["id"])
        self.assertEqual(entry.lines.count(), 2)
        self.assertEqual(entry.memo, "Balanced")

    def test_tenant_isolation_blocks_other_company_accounts(self):
        self.auth("accountant")
        url = reverse("journal-entry-list")
        res = self.client.post(
            url,
            {
                "date": "2024-01-03",
                "memo": "Wrong account",
                "lines": [
                    {"account_id": self.other_company_account.id, "debit": "50", "credit": "0"},
                    {"account_id": self.revenue.id, "debit": "0", "credit": "50"},
                ],
            },
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_user_without_permission_cannot_post(self):
        self.auth("hr")
        url = reverse("journal-entry-list")
        res = self.client.post(
            url,
            {
                "date": "2024-01-04",
                "memo": "No permission",
                "lines": [
                    {"account_id": self.cash.id, "debit": "10", "credit": "0"},
                    {"account_id": self.revenue.id, "debit": "0", "credit": "10"},
                ],
            },
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_delete_journal_entry_removes_entry(self):
        self.auth("accountant")
        entry = JournalEntry.objects.create(
            company=self.company_a,
            date="2024-01-05",
            memo="Delete me",
            created_by=self.accountant,
            status=JournalEntry.Status.DRAFT,
        )
        url = reverse("journal-entry-detail", kwargs={"pk": entry.id})
        res = self.client.delete(url)
        self.assertEqual(res.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(JournalEntry.objects.filter(id=entry.id).exists())