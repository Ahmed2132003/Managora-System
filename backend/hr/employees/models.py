"""
Employee and organization structure models.
All models use app_label='hr' so migrations remain under the hr app.
"""
from django.conf import settings
from django.db import models
from django.db.models import Q

from hr.models.base import BaseModel, SoftDeleteManager, SoftDeleteQuerySet


class Department(BaseModel):
    name = models.CharField(max_length=255)
    is_active = models.BooleanField(default=True)

    class Meta:
        app_label = "hr"
        constraints = [
            models.UniqueConstraint(
                fields=["company", "name"],
                name="unique_department_name_per_company",
            ),
        ]

    def __str__(self):
        return f"{self.company.name} - {self.name}"


class JobTitle(BaseModel):
    name = models.CharField(max_length=255)
    is_active = models.BooleanField(default=True)

    class Meta:
        app_label = "hr"
        constraints = [
            models.UniqueConstraint(
                fields=["company", "name"],
                name="unique_job_title_name_per_company",
            ),
        ]

    def __str__(self):
        return f"{self.company.name} - {self.name}"


class EmployeeQuerySet(SoftDeleteQuerySet):
    def active(self):
        return self.filter(is_deleted=False)


class EmployeeManager(SoftDeleteManager):
    def get_queryset(self):
        return EmployeeQuerySet(self.model, using=self._db).filter(is_deleted=False)

    def active(self):
        return self.get_queryset()


class Employee(BaseModel):
    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        INACTIVE = "inactive", "Inactive"
        TERMINATED = "terminated", "Terminated"

    employee_code = models.CharField(max_length=100)
    full_name = models.CharField(max_length=255)
    national_id = models.CharField(max_length=100, null=True, blank=True)
    hire_date = models.DateField()
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)
    department = models.ForeignKey(
        "hr.Department",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="employees",
    )
    job_title = models.ForeignKey(
        "hr.JobTitle",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="employees",
    )
    manager = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="subordinates",
    )
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="employee_profile",
    )
    shift = models.ForeignKey(
        "hr.Shift",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="employees",
    )

    objects = EmployeeManager()
    all_objects = models.Manager()

    class Meta:
        app_label = "hr"
        constraints = [
            models.UniqueConstraint(
                fields=["company", "employee_code"],
                name="unique_employee_code_per_company",
            ),
            models.UniqueConstraint(
                fields=["company", "national_id"],
                condition=Q(national_id__isnull=False),
                name="unique_employee_national_id_per_company",
            ),
        ]

    def __str__(self):
        return f"{self.company.name} - {self.full_name}"
