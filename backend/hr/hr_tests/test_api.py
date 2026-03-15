from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from core.models import Company, Permission, Role, RolePermission, UserRole
from hr.models import Department, Employee, JobTitle, Shift, WorkSite

User = get_user_model()


class HrApiTests(APITestCase):
    def setUp(self):
        self.c1 = Company.objects.create(name="C1")
        self.c2 = Company.objects.create(name="C2")

        self.hr = User.objects.create_user(
            username="hr",
            password="pass12345",
            company=self.c1,
        )
        self.manager = User.objects.create_user(
            username="manager",
            password="pass12345",
            company=self.c1,
        )
        self.accountant = User.objects.create_user(
            username="accountant",
            password="pass12345",
            company=self.c1,
        )

        self.hr_role = Role.objects.create(company=self.c1, name="HR")
        self.manager_role = Role.objects.create(company=self.c1, name="Manager")
        self.accountant_role = Role.objects.create(company=self.c1, name="Accountant")
        UserRole.objects.create(user=self.hr, role=self.hr_role)
        UserRole.objects.create(user=self.manager, role=self.manager_role)
        UserRole.objects.create(user=self.accountant, role=self.accountant_role)

        self.permissions = {
            code: Permission.objects.create(code=code, name=code)
            for code in [
                "hr.departments.view",
                "hr.departments.create",
                "hr.departments.edit",
                "hr.departments.delete",
                "hr.job_titles.view",
                "hr.job_titles.create",
                "hr.job_titles.edit",
                "hr.job_titles.delete",
                "hr.employees.view",
                "hr.employees.create",
                "hr.employees.edit",
                "hr.employees.delete",
                "hr.shifts.view",
                "hr.shifts.create",
                "hr.shifts.edit",
                "hr.shifts.delete",
                "hr.worksites.view",
                "hr.worksites.create",
                "hr.worksites.edit",
                "hr.worksites.delete",
            ]
        }
        for permission in self.permissions.values():
            RolePermission.objects.create(role=self.manager_role, permission=permission)
            RolePermission.objects.create(role=self.hr_role, permission=permission)

        for code in [
            "hr.shifts.view",
            "hr.shifts.create",
            "hr.shifts.edit",
            "hr.shifts.delete",
            "hr.worksites.view",
            "hr.worksites.create",
            "hr.worksites.edit",
            "hr.worksites.delete",
        ]:
            RolePermission.objects.create(role=self.accountant_role, permission=self.permissions[code])

        RolePermission.objects.create(
            role=self.manager_role,
            permission=self.permissions["hr.employees.view"],
        )

        self.department = Department.objects.create(
            company=self.c1, name="Engineering", is_active=True
        )
        self.job_title = JobTitle.objects.create(
            company=self.c1, name="Developer", is_active=True
        )
        self.other_department = Department.objects.create(
            company=self.c2, name="Other", is_active=True
        )

        self.employee = Employee.objects.create(
            company=self.c1,
            employee_code="EMP-1",
            full_name="Alice Smith",
            hire_date="2022-01-01",
            status=Employee.Status.ACTIVE,
            department=self.department,
            job_title=self.job_title,
        )
        self.other_employee = Employee.objects.create(
            company=self.c2,
            employee_code="EMP-2",
            full_name="Other",
            hire_date="2022-02-01",
            status=Employee.Status.ACTIVE,
            department=self.other_department,
        )

    def auth(self, username):
        url = reverse("token_obtain_pair")
        res = self.client.post(
            url, {"username": username, "password": "pass12345"}, format="json"
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {res.data['access']}")

    def test_hr_can_crud_department(self):
        self.auth("hr")
        url = reverse("department-list")
        res = self.client.post(
            url, {"name": "Ops", "is_active": True}, format="json"
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data["name"], "Ops")
        created = Department.objects.get(id=res.data["id"])
        self.assertEqual(created.company, self.c1)
        
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(any(dep["name"] == "Ops" for dep in res.data))

        dep_id = res.data[0]["id"]
        detail_url = reverse("department-detail", kwargs={"pk": dep_id})
        res = self.client.patch(detail_url, {"name": "Ops2"}, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_departments_are_tenant_scoped(self):
        self.auth("hr")
        url = reverse("department-list")
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        names = [dep["name"] for dep in res.data]
        self.assertIn(self.department.name, names)
        self.assertNotIn(self.other_department.name, names)
        
    def test_manager_can_create_employees(self):
        self.auth("manager")
        list_url = reverse("employee-list")
        res = self.client.post(
            list_url,
            {
                "employee_code": "EMP-NEW",
                "full_name": "Bob",
                "hire_date": "2023-01-01",
                "status": Employee.Status.ACTIVE,
            },
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

    def test_employee_list_filters_and_search(self):
        self.auth("hr")
        url = reverse("employee-list")

        res = self.client.get(url, {"status": Employee.Status.ACTIVE})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(any(emp["id"] == self.employee.id for emp in res.data))

        res = self.client.get(url, {"department": self.department.id})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(any(emp["id"] == self.employee.id for emp in res.data))

        res = self.client.get(url, {"search": "Alice"})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(any(emp["id"] == self.employee.id for emp in res.data))

    def test_employee_create_sets_company_and_validates_relations(self):
        self.auth("hr")
        url = reverse("employee-list")
        res = self.client.post(
            url,
            {
                "company": self.c2.id,
                "employee_code": "EMP-NEW",
                "full_name": "New Person",
                "hire_date": "2023-01-01",
                "status": Employee.Status.ACTIVE,
                "department": self.department.id,
                "job_title": self.job_title.id,
            },
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

        res = self.client.post(
            url,
            {
                "employee_code": "EMP-NEW",
                "full_name": "New Person",
                "hire_date": "2023-01-01",
                "status": Employee.Status.ACTIVE,
                "department": self.department.id,
                "job_title": self.job_title.id,
            },
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        created_id = res.data["id"]
        created = Employee.objects.get(id=created_id)
        self.assertEqual(created.company, self.c1)

        res = self.client.post(
            url,
            {
                "employee_code": "EMP-OTHER",
                "full_name": "Invalid",
                "hire_date": "2023-01-01",
                "status": Employee.Status.ACTIVE,
                "department": self.other_department.id,
            },
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_employee_code_unique_per_company(self):
        self.auth("hr")
        url = reverse("employee-list")
        res = self.client.post(
            url,
            {
                "employee_code": "EMP-1",
                "full_name": "Duplicate",
                "hire_date": "2023-01-01",
                "status": Employee.Status.ACTIVE,
            },
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_employee_update_rejects_cross_company_department(self):
        self.auth("hr")
        url = reverse("employee-detail", kwargs={"pk": self.employee.id})
        res = self.client.patch(
            url,
            {"department": self.other_department.id},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_employees_list_is_tenant_scoped(self):
        self.auth("hr")
        url = reverse("employee-list")
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        ids = [emp["id"] for emp in res.data]
        self.assertIn(self.employee.id, ids)
        self.assertNotIn(self.other_employee.id, ids)

    def test_soft_deleted_employee_not_in_list(self):
        self.auth("hr")
        delete_url = reverse("employee-detail", kwargs={"pk": self.employee.id})
        res = self.client.delete(delete_url)
        self.assertEqual(res.status_code, status.HTTP_204_NO_CONTENT)

        list_url = reverse("employee-list")
        res = self.client.get(list_url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        ids = [emp["id"] for emp in res.data]
        self.assertNotIn(self.employee.id, ids)


    def test_manager_and_hr_can_manage_shifts(self):
        self.auth("manager")
        url = reverse("shift-list")
        res = self.client.post(
            url,
            {
                "name": "Morning",
                "start_time": "09:00:00",
                "end_time": "17:00:00",
                "grace_minutes": 15,
                "is_active": True,
            },
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        shift_id = res.data["id"]

        patch_url = reverse("shift-detail", kwargs={"pk": shift_id})
        res = self.client.patch(patch_url, {"name": "Morning Updated"}, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        res = self.client.delete(patch_url)
        self.assertEqual(res.status_code, status.HTTP_204_NO_CONTENT)

        self.auth("hr")
        res = self.client.post(
            url,
            {
                "name": "Evening",
                "start_time": "13:00:00",
                "end_time": "21:00:00",
                "grace_minutes": 10,
                "is_active": True,
            },
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

    def test_accountant_cannot_manage_shifts_even_with_permissions(self):
        shift = Shift.objects.create(
            company=self.c1,
            name="Locked",
            start_time="09:00:00",
            end_time="17:00:00",
            grace_minutes=10,
            is_active=True,
        )
        self.auth("accountant")
        url = reverse("shift-list")
        res = self.client.post(
            url,
            {
                "name": "Nope",
                "start_time": "10:00:00",
                "end_time": "18:00:00",
                "grace_minutes": 10,
                "is_active": True,
            },
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

        detail_url = reverse("shift-detail", kwargs={"pk": shift.id})
        res = self.client.patch(detail_url, {"name": "Nope"}, format="json")
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

        res = self.client.delete(detail_url)
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_manager_and_hr_can_manage_worksites(self):
        self.auth("manager")
        url = reverse("worksite-list")
        res = self.client.post(
            url,
            {
                "name": "HQ",
                "lat": "30.044420",
                "lng": "31.235712",
                "radius_meters": 100,
                "is_active": True,
            },
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        worksite_id = res.data["id"]

        detail_url = reverse("worksite-detail", kwargs={"pk": worksite_id})
        res = self.client.patch(detail_url, {"radius_meters": 120}, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        res = self.client.delete(detail_url)
        self.assertEqual(res.status_code, status.HTTP_204_NO_CONTENT)

        self.auth("hr")
        res = self.client.post(
            url,
            {
                "name": "Branch",
                "lat": "29.999000",
                "lng": "31.100000",
                "radius_meters": 80,
                "is_active": True,
            },
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

    def test_accountant_cannot_manage_worksites_even_with_permissions(self):
        worksite = WorkSite.objects.create(
            company=self.c1,
            name="Old HQ",
            lat="30.044420",
            lng="31.235712",
            radius_meters=100,
            is_active=True,
        )
        self.auth("accountant")
        url = reverse("worksite-list")
        res = self.client.post(
            url,
            {
                "name": "Nope",
                "lat": "30.000000",
                "lng": "31.000000",
                "radius_meters": 50,
                "is_active": True,
            },
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

        detail_url = reverse("worksite-detail", kwargs={"pk": worksite.id})
        res = self.client.patch(detail_url, {"name": "Nope"}, format="json")
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

        res = self.client.delete(detail_url)
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)