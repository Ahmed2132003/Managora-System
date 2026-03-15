"""
Policy and HR action views. Re-exports from hr.views for domain URL config.
"""
from hr.views import HRActionViewSet, PolicyRuleViewSet

__all__ = [
    "HRActionViewSet",
    "PolicyRuleViewSet",
]
