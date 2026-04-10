from __future__ import annotations

from django.db import models
from django.shortcuts import get_object_or_404
from rest_framework.exceptions import NotAuthenticated
from rest_framework.viewsets import ModelViewSet

from core.permissions import RoleBasedPermission


class CompanyScopedQuerySet(models.QuerySet):
    def for_company(self, company):
        return self.filter(company=company)

    def for_user(self, user):
        if getattr(user, "is_superuser", False):
            company_id = getattr(user, "active_company_id", None) or getattr(
                user, "company_id", None
            )
            if company_id:
                return self.filter(company_id=company_id)
            return self
        return self.filter(company_id=getattr(user, "company_id", None))


class CompanyScopedManager(models.Manager):
    def get_queryset(self):
        return CompanyScopedQuerySet(self.model, using=self._db)

    def for_company(self, company):
        return self.get_queryset().for_company(company)

    def for_user(self, user):
        return self.get_queryset().for_user(user)


class CompanyScopedModel(models.Model):
    company = models.ForeignKey("core.Company", on_delete=models.CASCADE)

    objects = CompanyScopedManager()

    class Meta:
        abstract = True


class CompanyScopedViewSet(ModelViewSet):
    """
    Base class for tenant-isolated ViewSets.
    Uses queryset scoping so cross-tenant access naturally resolves to 404.
    """

    def _current_company(self):
        request = getattr(self, "request", None)
        if not request or not getattr(request, "user", None) or not request.user.is_authenticated:
            raise NotAuthenticated("Authentication credentials were not provided.")

        if request.user.is_superuser:
            if getattr(request, "company", None):
                return request.company
            if getattr(request.user, "company", None):
                return request.user.company
            return None
        return request.user.company

    def get_permissions(self):
        permissions = [permission() for permission in self.permission_classes]
        if not any(isinstance(permission, RoleBasedPermission) for permission in permissions):
            permissions.append(RoleBasedPermission())
        return permissions
    
    def get_queryset(self):
        queryset = super().get_queryset()
        company = self._current_company()
        if company is None:
            return queryset
        return queryset.filter(company=company)

    def get_object(self):
        queryset = self.filter_queryset(self.get_queryset())
        lookup_url_kwarg = self.lookup_url_kwarg or self.lookup_field
        lookup_value = self.kwargs.get(lookup_url_kwarg)
        return get_object_or_404(queryset, **{self.lookup_field: lookup_value})

    def perform_create(self, serializer):
        company = self._current_company()
        if company is None:
            serializer.save()
            return
        serializer.save(company=company)