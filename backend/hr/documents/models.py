"""
Employee document models.
"""
import os
import uuid

from django.conf import settings
from django.db import models
from hr.models.base import BaseModel


def employee_document_upload_to(instance, filename):
    ext = os.path.splitext(filename)[1].lower()
    safe_name = f"{uuid.uuid4().hex}{ext}"
    return (
        f"company_{instance.company_id}/employees/{instance.employee_id}/documents/{safe_name}"
    )


class EmployeeDocument(BaseModel):
    class DocumentType(models.TextChoices):
        CONTRACT = "contract", "Contract"
        ID = "id", "ID"
        OTHER = "other", "Other"

    class Category(models.TextChoices):
        EMPLOYEE_FILE = "employee_file", "Employee File"
        CONTRACT = "contract", "Contract"
        INVOICE = "invoice", "Invoice"
        OTHER = "other", "Other"

    class LinkedEntityType(models.TextChoices):
        EMPLOYEE = "employee", "Employee"
        INVOICE = "invoice", "Invoice"
        CONTRACT = "contract", "Contract"

    employee = models.ForeignKey(
        "hr.Employee",
        on_delete=models.CASCADE,
        related_name="documents",
    )
    doc_type = models.CharField(max_length=20, choices=DocumentType.choices)
    category = models.CharField(
        max_length=30,
        choices=Category.choices,
        default=Category.EMPLOYEE_FILE,
    )
    title = models.CharField(max_length=255, blank=True)
    linked_entity_type = models.CharField(
        max_length=20,
        choices=LinkedEntityType.choices,
        null=True,
        blank=True,
    )
    linked_entity_id = models.CharField(max_length=64, blank=True)
    file = models.FileField(upload_to=employee_document_upload_to)
    ocr_text = models.TextField(blank=True)
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="uploaded_employee_documents",
    )

    class Meta:
        app_label = "hr"

    def __str__(self):
        return f"{self.company.name} - {self.employee.full_name} - {self.doc_type}"
