from rest_framework.generics import ListCreateAPIView
from rest_framework.views import APIView


class ThrottledInitialMixin:
    """
    Ensure throttling is checked EARLY but without breaking DRF lifecycle.
    """

    def initial(self, request, *args, **kwargs):
        # خليه يمشي بالـ lifecycle الطبيعي
        super().initial(request, *args, **kwargs)

        # 🔥 enforce throttling explicitly (حتى لو في حاجة عطلتها قبل كده)
        self.check_throttles(request)


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
