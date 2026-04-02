from .base import *

# Keep debug tracebacks visible during test diagnostics.
DEBUG = True

# Use local in-memory cache during tests to avoid external Redis dependency.
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
        "LOCATION": "managora-test-cache",
        "TIMEOUT": 300,
        "KEY_PREFIX": "managora-test",
    }
}

# Run Celery tasks synchronously and avoid broker/network access in tests.
CELERY_TASK_ALWAYS_EAGER = True
CELERY_TASK_EAGER_PROPAGATES = True
CELERY_BROKER_URL = "memory://"
CELERY_RESULT_BACKEND = "cache+memory://"