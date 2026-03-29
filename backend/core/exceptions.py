from rest_framework import status
from rest_framework.exceptions import Throttled
from rest_framework.response import Response
from rest_framework.views import exception_handler


def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)

    if isinstance(exc, Throttled):
        wait = getattr(exc, "wait", None)
        payload = {"detail": "Request was throttled."}
        if wait is not None:
            payload["wait"] = wait
        return Response(payload, status=status.HTTP_429_TOO_MANY_REQUESTS)

    return response