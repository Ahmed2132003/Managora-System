from decimal import Decimal, InvalidOperation
from io import BytesIO

from django.db import models
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas

from hr.models import AttendanceRecord
from hr.services.attendance import approved_attendance_queryset


def _format_amount(value: Decimal | None) -> str:
    if value is None:
        return "-"
    return f"{value:.2f}"


def _safe_text(value: str | None, fallback: str = "-") -> str:
    if not value:
        return fallback
    return value if value.isascii() else fallback


def _safe_line_label(line) -> str:
    name = _safe_text(line.name, "")
    if name:
        return name
    code = _safe_text(line.code, "")
    return code or "Line"


def _parse_decimal(value) -> Decimal:    
    if isinstance(value, Decimal):
        return value
    if value is None:
        return Decimal("0")
    try:
        return Decimal(str(value))
    except (InvalidOperation, TypeError, ValueError):
        return Decimal("0")


def _get_basic_display_amount(lines, fallback_amount: Decimal) -> Decimal:
    for line in lines:
        name = (line.name or "").lower()
        code = (line.code or "").lower()
        if "basic" in name or "basic" in code:
            return _parse_decimal(line.amount)
    return fallback_amount


def _resolve_daily_rate(period_type: str | None, basic_amount: Decimal) -> Decimal:
    if basic_amount <= 0:
        return Decimal("0")
    if period_type == "daily":
        return basic_amount
    if period_type == "weekly":
        return basic_amount / Decimal("7")
    return basic_amount / Decimal("30")


def _build_run_summary(payroll_run, lines):
    period = payroll_run.period
    if not period or not period.start_date or not period.end_date:
        return None
    total_days = (period.end_date - period.start_date).days + 1
    total_days = max(total_days, 1)
    attendance_records = approved_attendance_queryset(AttendanceRecord.objects.filter(        
        company=payroll_run.company,
        employee=payroll_run.employee,
        date__range=(period.start_date, period.end_date),
    ))
    present_days = attendance_records.exclude(status=AttendanceRecord.Status.ABSENT).count()
    absent_days = max(total_days - present_days, 0)
    late_minutes = (
        attendance_records.aggregate(total=models.Sum("late_minutes")).get("total") or 0
    )

    basic_line = next(
        (line for line in lines if (line.code or "").upper() == "BASIC"),
        None,
    )
    basic_amount = _parse_decimal(basic_line.amount) if basic_line else Decimal("0")
    meta_rate = None
    if basic_line and isinstance(basic_line.meta, dict):
        meta_rate = basic_line.meta.get("rate")
    daily_rate = _parse_decimal(meta_rate) if meta_rate else _resolve_daily_rate(
        period.period_type, basic_amount
    )
    bonuses = sum(
        _parse_decimal(line.amount)
        for line in lines
        if line.type == "earning"
        and (line.code or "").upper() != "BASIC"
        and not (line.code or "").upper().startswith("COMM-")
    )
    commissions = sum(
        _parse_decimal(line.amount)
        for line in lines
        if line.type == "earning"
        and (line.code or "").upper().startswith("COMM-")
    )
    deductions = sum(
        _parse_decimal(line.amount)
        for line in lines
        if line.type == "deduction"
        and not (line.code or "").upper().startswith("LOAN-")
    )    
    advances = sum(
        _parse_decimal(line.amount)
        for line in lines
        if line.type == "deduction"
        and (line.code or "").upper().startswith("LOAN-")
    )
    payable_total = (
        _parse_decimal(present_days) * daily_rate
        + bonuses
        + commissions
        - deductions
        - advances
    )
    return {
        "present_days": present_days,
        "absent_days": absent_days,
        "late_minutes": late_minutes,
        "bonuses": bonuses,
        "commissions": commissions,
        "deductions": deductions,
        "advances": advances,
        "daily_rate": daily_rate,
        "payable_total": payable_total,
    }

def render_payslip_pdf(payroll_run, manager_name: str = "-", hr_name: str = "-"):
    buffer = BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4

    company_name = _safe_text(payroll_run.company.name, "Company")
    employee_name = _safe_text(payroll_run.employee.full_name, payroll_run.employee.employee_code)
    manager_display = _safe_text(manager_name)
    hr_display = _safe_text(hr_name)

    y = height - 20 * mm
    pdf.setFont("Helvetica-Bold", 14)
    pdf.drawString(20 * mm, y, company_name)
    y -= 8 * mm

    pdf.setFont("Helvetica", 10)
    pdf.drawString(20 * mm, y, f"Employee: {employee_name}")
    y -= 5 * mm
    pdf.drawString(20 * mm, y, f"Employee Code: {payroll_run.employee.employee_code}")    
    y -= 5 * mm
    period = payroll_run.period
    period_label = f"{period.start_date} to {period.end_date}"
    pdf.drawString(20 * mm, y, f"Period: {period_label}")
    y -= 10 * mm

    all_lines = list(payroll_run.lines.all())
    basic_display = _get_basic_display_amount(all_lines, _parse_decimal(payroll_run.earnings_total))
    summary = _build_run_summary(payroll_run, all_lines) or {}
    payable_total = summary.get("payable_total", _parse_decimal(payroll_run.net_total))
        
    pdf.setFont("Helvetica", 10)
    pdf.drawString(20 * mm, y, "Basic")
    pdf.setFont("Helvetica-Bold", 10)
    pdf.drawString(40 * mm, y, _format_amount(basic_display))
    pdf.setFont("Helvetica", 10)
    pdf.drawString(75 * mm, y, "Payable total:")    
    pdf.setFont("Helvetica-Bold", 10)
    pdf.drawString(110 * mm, y, _format_amount(payable_total))
    y -= 10 * mm

    pdf.setFont("Helvetica-Bold", 11)
    pdf.drawString(20 * mm, y, "Run details")
    y -= 6 * mm

    def draw_summary_cell(x, y_cell, label, value):
        pdf.setFont("Helvetica", 9)
        pdf.drawString(x, y_cell, label)
        pdf.setFont("Helvetica-Bold", 10)
        pdf.drawString(x, y_cell - 4 * mm, str(value))

    col_x = [20 * mm, 90 * mm, 150 * mm]
    draw_summary_cell(col_x[0], y, "Attendance days", summary.get("present_days", 0))
    draw_summary_cell(col_x[1], y, "Absence days", summary.get("absent_days", 0))
    draw_summary_cell(col_x[2], y, "Late minutes", summary.get("late_minutes", 0))
    y -= 12 * mm
    draw_summary_cell(col_x[0], y, "Bonuses", _format_amount(summary.get("bonuses")))
    draw_summary_cell(col_x[1], y, "Deductions", _format_amount(summary.get("deductions")))
    draw_summary_cell(col_x[2], y, "Advances", _format_amount(summary.get("advances")))
    y -= 12 * mm
    draw_summary_cell(col_x[0], y, "Payable total", _format_amount(payable_total))    
    y -= 12 * mm

    pdf.setFont("Helvetica-Bold", 11)
    pdf.drawString(20 * mm, y, "Lines")
    y -= 6 * mm

    pdf.setFont("Helvetica-Bold", 10)
    pdf.drawString(22 * mm, y, "Line")
    pdf.drawString(110 * mm, y, "Type")
    pdf.drawRightString(width - 20 * mm, y, "Amount")
    y -= 5 * mm
    pdf.setFont("Helvetica", 10)
    for line in all_lines:
        pdf.drawString(22 * mm, y, _safe_line_label(line))        
        pdf.drawString(110 * mm, y, str(line.type))
        pdf.drawRightString(width - 20 * mm, y, f"{line.amount:.2f}")
        y -= 5 * mm
        if y < 40 * mm:
            pdf.showPage()
            y = height - 20 * mm
            pdf.setFont("Helvetica", 10)

    if y < 45 * mm:
        pdf.showPage()
        y = height - 20 * mm
    pdf.setFont("Helvetica-Bold", 10)
    pdf.drawString(22 * mm, y, "Payable total")    
    pdf.drawRightString(width - 20 * mm, y, _format_amount(payable_total))
    y -= 10 * mm

    pdf.setFont("Helvetica", 10)
    pdf.drawString(20 * mm, y, f"Company: {company_name}")
    y -= 5 * mm
    pdf.drawString(20 * mm, y, f"Manager: {manager_display}")
    y -= 5 * mm
    pdf.drawString(20 * mm, y, f"HR: {hr_display}")
    
    pdf.save()
    buffer.seek(0)
    return buffer.getvalue()

def render_payslip_png(
    payroll_run, dpi: int = 200, manager_name: str = "-", hr_name: str = "-"
) -> bytes:
    """Render payslip as PNG bytes (first page) using PyMuPDF (fitz)."""
    import fitz  # PyMuPDF

    pdf_bytes = render_payslip_pdf(
        payroll_run, manager_name=manager_name, hr_name=hr_name
    )
    # Safety: ensure PDF signature
    if not pdf_bytes or pdf_bytes[:4] != b"%PDF":
        raise ValueError("Invalid PDF bytes generated for payslip")

    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    try:
        page = doc.load_page(0)
        pix = page.get_pixmap(dpi=dpi, alpha=False)
        return pix.tobytes("png")
    finally:
        doc.close()
