from rest_framework.exceptions import Throttled
from rest_framework.generics import ListCreateAPIView
from rest_framework.views import APIView


class ThrottledInitialMixin:
    """Run throttling checks before any serializer validation/business logic."""

    def initial(self, request, *args, **kwargs):
        self.format_kwarg = self.get_format_suffix(**kwargs)

        neg = self.perform_content_negotiation(request)
        request.accepted_renderer, request.accepted_media_type = neg

        version, scheme = self.determine_version(request, *args, **kwargs)
        request.version, request.versioning_scheme = version, scheme

        self.perform_authentication(request)
        self.check_permissions(request)

        throttle_waits = []
        for throttle in self.get_throttles():
            if not throttle.allow_request(request, self):
                throttle_waits.append(throttle.wait())

        if throttle_waits:
            wait = max([wait for wait in throttle_waits if wait is not None], default=None)
            raise Throttled(wait=wait)


class ThrottledAPIView(ThrottledInitialMixin, APIView):
    """APIView variant that prioritizes throttling checks."""


class ThrottledListCreateAPIView(ThrottledInitialMixin, ListCreateAPIView):
    """ListCreateAPIView variant that prioritizes throttling checks."""