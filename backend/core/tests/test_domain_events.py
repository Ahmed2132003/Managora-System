from django.test import SimpleTestCase

from core.events.dispatcher import dispatch, register


class DomainEventsDispatcherTests(SimpleTestCase):
    def test_dispatch_calls_registered_handlers(self):
        events = []

        def handler(payload):
            events.append(payload)

        register("test.event", handler)
        payload = {"value": 1}

        dispatch("test.event", payload)

        self.assertEqual(events, [payload])

    def test_dispatch_does_not_crash_when_handler_fails(self):
        events = []

        def failing_handler(payload):
            raise RuntimeError("boom")

        def healthy_handler(payload):
            events.append(payload)

        register("test.fault_tolerant", failing_handler)
        register("test.fault_tolerant", healthy_handler)

        payload = {"value": 2}
        dispatch("test.fault_tolerant", payload)

        self.assertEqual(events, [payload])