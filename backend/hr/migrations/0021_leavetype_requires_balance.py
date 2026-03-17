from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("hr", "0020_leavetype_strict_balance"),
    ]

    operations = [
        migrations.AddField(
            model_name="leavetype",
            name="requires_balance",
            field=models.BooleanField(default=True),
        ),
    ]