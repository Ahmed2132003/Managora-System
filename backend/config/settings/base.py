from pathlib import Path
import os
import importlib.util
import sys

from datetime import timedelta

from celery.schedules import crontab

BASE_DIR = Path(__file__).resolve().parent.parent.parent  # backend/

SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key-change-me")
# Optional: urlsafe_b64 Fernet key (32 bytes) for encrypting company email app passwords
ATTENDANCE_EMAIL_ENCRYPTION_KEY = os.getenv("ATTENDANCE_EMAIL_ENCRYPTION_KEY", "") or None
ATTENDANCE_OTP_MODE = "email"
EMAIL_BACKEND = os.getenv("EMAIL_BACKEND", "django.core.mail.backends.smtp.EmailBackend")
EMAIL_HOST = os.getenv("EMAIL_HOST", "smtp.gmail.com")
EMAIL_PORT = int(os.getenv("EMAIL_PORT", "587"))
EMAIL_USE_TLS = (os.getenv("EMAIL_USE_TLS", "1") == "1")
EMAIL_HOST_USER = os.getenv("EMAIL_HOST_USER", "")
EMAIL_HOST_PASSWORD = os.getenv("EMAIL_HOST_PASSWORD", "")
ATTENDANCE_OTP_SENDER_EMAIL = os.getenv("ATTENDANCE_OTP_SENDER_EMAIL", EMAIL_HOST_USER) or None
ATTENDANCE_OTP_APP_PASSWORD = os.getenv("ATTENDANCE_OTP_APP_PASSWORD", EMAIL_HOST_PASSWORD) or None
ATTENDANCE_OTP_SMTP_HOST = os.getenv("ATTENDANCE_OTP_SMTP_HOST", EMAIL_HOST)
ATTENDANCE_OTP_SMTP_PORT = int(os.getenv("ATTENDANCE_OTP_SMTP_PORT", str(EMAIL_PORT)))
TWO_FA_ENCRYPTION_KEY = os.getenv("TWO_FA_ENCRYPTION_KEY", "") or None
TWO_FA_ISSUER_NAME = os.getenv("TWO_FA_ISSUER_NAME", "Managora")
NOTIFICATIONS_EMAIL_ENABLED = os.getenv("NOTIFICATIONS_EMAIL_ENABLED", "1") == "1"
NOTIFICATIONS_EMAIL_ENABLED = os.getenv("NOTIFICATIONS_EMAIL_ENABLED", "1") == "1"
DEFAULT_FROM_EMAIL = EMAIL_HOST_USER
DEBUG = os.getenv("DEBUG", "1") == "1"
DEBUG = os.getenv("DEBUG", "1") == "1"

ALLOWED_HOSTS = [h.strip() for h in os.getenv("ALLOWED_HOSTS", "localhost,127.0.0.1").split(",") if h.strip()]
APP_VERSION = os.getenv("APP_VERSION", "0.1.0")
BUILD_SHA = os.getenv("BUILD_SHA", os.getenv("COMMIT_SHA", ""))
APP_ENVIRONMENT = os.getenv("APP_ENVIRONMENT", "dev" if DEBUG else "prod")
ADMIN_URL_PATH = os.getenv("ADMIN_URL_PATH", "managora_super/")

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",

    # Third-party
    "rest_framework",
    "corsheaders",
    "drf_spectacular",

    # Local
    "core.apps.CoreConfig",
    "hr.apps.HrConfig",
    "accounting.apps.AccountingConfig",
    "analytics.apps.AnalyticsConfig",
]
if importlib.util.find_spec("storages") is not None:
    INSTALLED_APPS.append("storages")
    
MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",

    # CORS must be high
    "corsheaders.middleware.CorsMiddleware",

    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "core.middleware.AuditContextMiddleware",
    "core.middleware.RequestLoggingMiddleware",
    "core.middleware.GlobalExceptionMiddleware",    
    "django.contrib.messages.middleware.MessageMiddleware",    
    "django.middleware.clickjacking.XFrameOptionsMiddleware",    
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    }
]

WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

# Database (Postgres in docker)
DEFAULT_POSTGRES_HOST = "db" if Path("/.dockerenv").exists() else "localhost"
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": os.getenv("POSTGRES_DB", "app"),
        "USER": os.getenv("POSTGRES_USER", "app"),
        "PASSWORD": os.getenv("POSTGRES_PASSWORD", "app"),
        "HOST": os.getenv("POSTGRES_HOST", DEFAULT_POSTGRES_HOST),        
        "PORT": os.getenv("POSTGRES_PORT", "5432"),
    }
}

AUTH_USER_MODEL = "core.User"

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "en-us"
TIME_ZONE = "Africa/Cairo"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = os.getenv("STATIC_ROOT", "/app/staticfiles")
MEDIA_URL = "/media/"
MEDIA_ROOT = os.getenv("MEDIA_ROOT", "/app/media")
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# DRF
TESTING = "test" in sys.argv
DISABLE_THROTTLING = os.getenv("DISABLE_THROTTLING", "").strip().lower() == "true"

REST_FRAMEWORK = {    
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "core.authentication.AuditJWTAuthentication",        
    ),
    # مهم: نخلي الافتراضي محمي، ونفتح اللي لازم AllowAny
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticated",
    ),
    "DEFAULT_PAGINATION_CLASS": "core.pagination.OptionalPagination",
    "PAGE_SIZE": 20,
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "EXCEPTION_HANDLER": "core.exceptions.custom_exception_handler",
    "DEFAULT_THROTTLE_CLASSES": (
        "core.throttles.ReadWriteUserRateThrottle",
    ),    
    "DEFAULT_THROTTLE_RATES": {
        "user": "120/min",
        "user_read": "300/min",
        "user_write": "90/min",
        "analytics": "120/min",
        "login": "5/min",
        "otp": "5/min",        
        "attendance": "10/min",
        "upload": "3/min",        
        "copilot": "30/min",
        "export": "30/min",
    },
}

if TESTING:
    # Keep throttling code paths exercised in tests while preventing
    # unrelated tests from tripping strict production limits.
    REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"] = {
        "user": "10000/min",
        "user_read": "10000/min",
        "user_write": "10000/min",
        "analytics": "10000/min",
        "login": "10000/min",                    
        "otp": "10000/min",
        "attendance": "10000/min",
        "upload": "10000/min",
        "copilot": "10000/min",
        "export": "10000/min",
    }
        
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=15),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": False,
    "BLACKLIST_AFTER_ROTATION": False,
    "AUTH_HEADER_TYPES": ("Bearer",),
    "TOKEN_OBTAIN_SERIALIZER": "core.serializers.auth.LoginSerializer",

}

# OpenAPI
SPECTACULAR_SETTINGS = {
    "TITLE": "Managora API",
    "DESCRIPTION": "Company OS API (Phase 1)",
    "VERSION": "0.1.0",
}

CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
]
CSRF_TRUSTED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
]
CORS_ALLOWED_ORIGIN_REGEXES = [
    r"^http://localhost:\\d+$",
    r"^http://127\\.0\\.0\\.1:\\d+$",
]
CORS_ALLOW_CREDENTIALS = True

# Caching
REDIS_URL = os.getenv("REDIS_URL", "")
CACHES = {
    "default": {
        "BACKEND": "django_redis.cache.RedisCache" if REDIS_URL else "django.core.cache.backends.locmem.LocMemCache",
        "LOCATION": REDIS_URL or "locmem://",
        "OPTIONS": {"CLIENT_CLASS": "django_redis.client.DefaultClient"} if REDIS_URL else {},
    }
}
CACHE_TTL = int(os.getenv("CACHE_TTL", "60"))

# Secure file storage (Amazon S3)
AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID", "")
AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY", "")
AWS_STORAGE_BUCKET_NAME = os.getenv("AWS_STORAGE_BUCKET_NAME", "")
AWS_S3_REGION_NAME = os.getenv("AWS_S3_REGION_NAME", "")
AWS_S3_SIGNATURE_VERSION = "s3v4"
AWS_QUERYSTRING_AUTH = True
AWS_QUERYSTRING_EXPIRE = int(os.getenv("AWS_QUERYSTRING_EXPIRE", "300"))
AWS_DEFAULT_ACL = None
AWS_S3_FILE_OVERWRITE = False
AWS_S3_OBJECT_PARAMETERS = {"ServerSideEncryption": "AES256"}
USE_S3_MEDIA_STORAGE = os.getenv("USE_S3_MEDIA_STORAGE", "0") == "1"
if USE_S3_MEDIA_STORAGE and AWS_STORAGE_BUCKET_NAME:
    DEFAULT_FILE_STORAGE = "storages.backends.s3boto3.S3Boto3Storage"
    
# Celery
CELERY_BROKER_URL = os.getenv("CELERY_BROKER_URL", "redis://localhost:6379/0")
CELERY_RESULT_BACKEND = os.getenv("CELERY_RESULT_BACKEND", CELERY_BROKER_URL)
CELERY_ACCEPT_CONTENT = ["json"]
CELERY_TASK_SERIALIZER = "json"
CELERY_RESULT_SERIALIZER = "json"
CELERY_TIMEZONE = TIME_ZONE

CELERY_BEAT_SCHEDULE = {
    "analytics-build-yesterday": {
        "task": "analytics.tasks.build_yesterday_kpis",
        "schedule": crontab(hour=2, minute=0),
    },
    "analytics-backfill-30-days": {
        "task": "analytics.tasks.backfill_last_30_days",
        "schedule": crontab(hour=3, minute=0, day_of_week="mon"),
    },
    "backups-daily-company": {
        "task": "core.tasks.create_daily_company_backups",
        "schedule": crontab(hour=1, minute=0),
    },
}

# Structured logging
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "json": {"()": "core.logging.JsonFormatter"},
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "json",
        },
    },
    "loggers": {
        "managora.request": {
            "handlers": ["console"],
            "level": os.getenv("REQUEST_LOG_LEVEL", "INFO"),
            "propagate": False,
        },
        "django.request": {
            "handlers": ["console"],
            "level": os.getenv("DJANGO_REQUEST_LOG_LEVEL", "ERROR"),
            "propagate": False,
        },
    },
    "root": {
        "handlers": ["console"],
        "level": os.getenv("LOG_LEVEL", "INFO"),
    },
}

# Sentry
SENTRY_DSN = os.getenv("SENTRY_DSN", "")
SENTRY_ENVIRONMENT = os.getenv("SENTRY_ENVIRONMENT", APP_ENVIRONMENT)
SENTRY_SAMPLE_RATE = float(os.getenv("SENTRY_SAMPLE_RATE", "0.1"))

if SENTRY_DSN:
    import sentry_sdk
    from sentry_sdk.integrations.django import DjangoIntegration

    def _scrub_event(event, hint):
        request = event.get("request")
        if request:
            headers = request.get("headers", {})
            for key in ["Authorization", "Cookie", "X-Api-Key"]:
                headers.pop(key, None)
            request["headers"] = headers
            event["request"] = request
        user = event.get("user")
        if user:
            for key in ["email", "username"]:
                user.pop(key, None)
            event["user"] = user
        return event

    sentry_sdk.init(
        dsn=SENTRY_DSN,
        environment=SENTRY_ENVIRONMENT,
        release=BUILD_SHA or None,
        send_default_pii=False,
        traces_sample_rate=SENTRY_SAMPLE_RATE,
        before_send=_scrub_event,
        integrations=[DjangoIntegration()],
    )