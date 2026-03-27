from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0017_auditlog_audit_comp_created_desc_idx"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="backup_codes",
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.AddField(
            model_name="user",
            name="is_2fa_enabled",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="user",
            name="otp_secret",
            field=models.TextField(blank=True, default=""),
        ),
    ]