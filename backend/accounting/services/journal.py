from __future__ import annotations

from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import transaction

from accounting.models import Account, JournalEntry, JournalLine


BALANCE_TOLERANCE = Decimal("0.01")


def post_journal_entry(company, payload, created_by=None):
    lines_payload = payload.get("lines") or []
    if not lines_payload:
        raise ValidationError("Journal entry must have at least one line.")

    account_ids = {line.get("account_id") for line in lines_payload}
    if None in account_ids:
        raise ValidationError("Each line must include an account.")
    accounts = {
        account.id: account
        for account in Account.objects.filter(company=company, id__in=account_ids)
    }
    if len(accounts) != len(account_ids):
        raise ValidationError("Account must belong to the same company.")

    total_debit = Decimal("0")
    total_credit = Decimal("0")
    normalized_lines = []

    for line in lines_payload:
        debit = Decimal(str(line.get("debit") or 0))
        credit = Decimal(str(line.get("credit") or 0))

        if debit <= 0 and credit <= 0:
            raise ValidationError("Journal line must have a debit or credit amount.")
        if debit > 0 and credit > 0:
            raise ValidationError("Journal line cannot have both debit and credit.")

        total_debit += debit
        total_credit += credit
        normalized_lines.append(
            {
                "account_id": line["account_id"],
                "description": line.get("description", ""),
                "debit": debit,
                "credit": credit,
            }
        )

    if (total_debit - total_credit).copy_abs() > BALANCE_TOLERANCE:
        raise ValidationError("Journal entry is not balanced.")

    with transaction.atomic():
        entry = JournalEntry.objects.create(
            company=company,
            date=payload["date"],
            reference_type=payload.get("reference_type", JournalEntry.ReferenceType.MANUAL),
            reference_id=payload.get("reference_id"),
            memo=payload.get("memo", ""),
            status=payload.get("status", JournalEntry.Status.POSTED),
            created_by=created_by,
        )
        JournalLine.objects.bulk_create(
            [
                JournalLine(
                    company=company,
                    entry=entry,
                    account=accounts[line["account_id"]],
                    description=line["description"],
                    debit=line["debit"],
                    credit=line["credit"],
                )
                for line in normalized_lines
            ]
        )

    return entry