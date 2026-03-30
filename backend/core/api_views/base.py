from rest_framework.generics import ListCreateAPIView
from rest_framework.views import APIView


class ThrottledInitialMixin:
    """
    Ensure throttling is checked before view handler logic executes.
    """

    def initial(self, request, *args, **kwargs):
        # Keep DRF lifecycle pieces intact while enforcing throttles early.
        self.format_kwarg = self.get_format_suffix(**kwargs)

        neg = self.perform_content_negotiation(request)
        request.accepted_renderer, request.accepted_media_type = neg

        version, scheme = self.determine_version(request, *args, **kwargs)
        request.version, request.versioning_scheme = version, scheme

        self.perform_authentication(request)
        self.check_throttles(request)
        self.check_permissions(request)

class ThrottledAPIView(ThrottledInitialMixin, APIView):
    """
    APIView variant that guarantees throttling enforcement.
    """
    pass


class ThrottledListCreateAPIView(ThrottledInitialMixin, ListCreateAPIView):
    """
    ListCreateAPIView variant that guarantees throttling enforcement.
    """
    pass
