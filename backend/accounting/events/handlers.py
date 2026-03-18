"""Domain event handlers for the accounting bounded context."""

from accounting.events import handle_payroll_accounting

__all__ = ["handle_payroll_accounting"]