from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("hr", "0019_employeedocument_category_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="leavetype",
            name="strict_balance",
            field=models.BooleanField(default=True),
        ),
    ]