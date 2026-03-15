"""
Document URLs are mounted under employees (employee documents).
This module exists for domain structure; actual routes are in hr.employees.urls.
"""
from django.urls import path

# Document-specific routes are in employees/urls.py (employees/<id>/documents/, documents/<pk>/).
# If you add standalone document routes later, add them here and include in central urls.
urlpatterns = []
