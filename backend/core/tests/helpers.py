from core.models import Permission


def create_permission(code, name):
    return Permission.objects.get_or_create(
        code=code,
        defaults={"name": name},
    )[0]