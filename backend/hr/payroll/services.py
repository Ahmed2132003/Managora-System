"""
Payroll domain services: period generation, lock, payslip.
Re-exports from hr.services for use by payroll views.
"""
from hr.services.generator import generate_period
from hr.services.lock import lock_period
from hr.services.payslip import render_payslip_pdf

__all__ = [
    "generate_period",
    "lock_period",
    "render_payslip_pdf",
]
