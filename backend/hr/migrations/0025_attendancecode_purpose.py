from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("hr", "0024_attendancerecord_created_by_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="attendancecode",
            name="purpose",
            field=models.CharField(
                choices=[("checkin", "Check-in"), ("checkout", "Check-out")],
                default="checkin",
                max_length=10,
            ),
        ),
    ]