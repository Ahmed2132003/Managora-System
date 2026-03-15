"""
Employee/organization domain services.
Re-exports from shared hr.services.defaults for use by employees views/serializers.
"""
from hr.services.defaults import (
    ensure_default_shifts,
    get_company_manager,
    get_default_shift,
)

__all__ = [
    "ensure_default_shifts",
    "get_company_manager",
    "get_default_shift",
]
