from __future__ import annotations

import base64
import hashlib
import io
import json
import logging
import struct
import secrets
import time
from datetime import timedelta
from urllib.parse import quote

try:
    import pyotp  # type: ignore
except ModuleNotFoundError:  # pragma: no cover - fallback for restricted envs
    pyotp = None
try:
    import qrcode  # type: ignore
except ModuleNotFoundError:  # pragma: no cover
    qrcode = None
from cryptography.fernet import Fernet, InvalidToken
from django.conf import settings
from django.core import signing
from django.utils import timezone

from core.services.cache_utils import (
    safe_cache_delete,
    safe_cache_get,
    safe_cache_set,
)

logger = logging.getLogger(__name__)

TEMP_TOKEN_TTL_SECONDS = 300
TEMP_TOKEN_PURPOSE = "login_2fa"
BACKUP_CODES_COUNT = 10
BACKUP_CODE_BYTES = 5


def _fernet() -> Fernet:
    configured_key = getattr(settings, "TWO_FA_ENCRYPTION_KEY", "") or ""
    if configured_key:
        return Fernet(configured_key.encode())
    derived_key = base64.urlsafe_b64encode(hashlib.sha256(settings.SECRET_KEY.encode()).digest())
    return Fernet(derived_key)


def encrypt_secret(secret: str) -> str:
    return _fernet().encrypt(secret.encode()).decode()


def decrypt_secret(token: str) -> str:
    if not token:
        return ""
    try:
        return _fernet().decrypt(token.encode()).decode()
    except InvalidToken as exc:
        logger.warning("Invalid OTP secret payload", exc_info=exc)
        return ""


def generate_totp_secret() -> str:
    if pyotp:
        return pyotp.random_base32()
    return base64.b32encode(secrets.token_bytes(20)).decode().rstrip("=")


def provisioning_uri(*, email: str, secret: str) -> str:
    issuer = getattr(settings, "TWO_FA_ISSUER_NAME", "Managora")
    if pyotp:
        return pyotp.TOTP(secret).provisioning_uri(name=email, issuer_name=issuer)
    return f"otpauth://totp/{quote(issuer)}:{quote(email)}?secret={secret}&issuer={quote(issuer)}"


def provisioning_qr_base64(uri: str) -> str:
    if not qrcode:
        return ""
    qr = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_M, box_size=6, border=2)
    qr.add_data(uri)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    return base64.b64encode(buffer.getvalue()).decode()


def verify_totp(*, secret: str, code: str) -> bool:
    if pyotp:
        return pyotp.TOTP(secret).verify(code, valid_window=1)
    if not code.isdigit():
        return False
    for offset in (-30, 0, 30):
        if _totp(secret, int(time.time()) + offset) == code:
            return True
    return False


def current_totp_code(secret: str) -> str:
    if pyotp:
        return pyotp.TOTP(secret).now()
    return _totp(secret, int(time.time()))


def _totp(secret: str, ts: int, digits: int = 6, period: int = 30) -> str:
    key = base64.b32decode(secret + "=" * ((8 - len(secret) % 8) % 8), casefold=True)
    counter = struct.pack(">Q", int(ts / period))
    digest = hmac_new(key, counter)
    offset = digest[-1] & 0x0F
    code = (struct.unpack(">I", digest[offset : offset + 4])[0] & 0x7FFFFFFF) % (10**digits)
    return str(code).zfill(digits)


def hmac_new(key: bytes, msg: bytes) -> bytes:
    import hmac

    return hmac.new(key, msg, hashlib.sha1).digest()


def _backup_code_hash(code: str) -> str:
    return hashlib.sha256(f"{settings.SECRET_KEY}:{code}".encode()).hexdigest()


def generate_backup_codes() -> tuple[list[str], list[str]]:
    plain_codes: list[str] = []
    hashed_codes: list[str] = []
    for _ in range(BACKUP_CODES_COUNT):
        code = secrets.token_hex(BACKUP_CODE_BYTES).upper()
        plain_codes.append(code)
        hashed_codes.append(_backup_code_hash(code))
    return plain_codes, hashed_codes


def consume_backup_code(*, hashed_codes: list[str], provided_code: str) -> tuple[bool, list[str]]:
    incoming_hash = _backup_code_hash(provided_code.upper())
    remaining = [item for item in hashed_codes if item != incoming_hash]
    return len(remaining) != len(hashed_codes), remaining


def issue_login_temp_token(*, user_id: int, ip: str) -> str:
    payload = {
        "uid": user_id,
        "ip": ip,
        "purpose": TEMP_TOKEN_PURPOSE,
        "nonce": secrets.token_urlsafe(12),
        "exp": (timezone.now() + timedelta(seconds=TEMP_TOKEN_TTL_SECONDS)).timestamp(),
    }
    token = signing.dumps(payload, salt="core.2fa.temp")
    safe_cache_set(f"2fa:temp:{payload['nonce']}", 1, timeout=TEMP_TOKEN_TTL_SECONDS)    
    return token


def verify_login_temp_token(*, temp_token: str, ip: str) -> int | None:
    try:
        payload = signing.loads(temp_token, salt="core.2fa.temp", max_age=TEMP_TOKEN_TTL_SECONDS)
    except signing.BadSignature:
        return None

    if payload.get("purpose") != TEMP_TOKEN_PURPOSE:
        return None
    if payload.get("ip") != ip:
        return None
    nonce = payload.get("nonce")
    if not nonce or not safe_cache_get(f"2fa:temp:{nonce}"):
        return None
    safe_cache_delete(f"2fa:temp:{nonce}")
    return payload.get("uid")


def record_failed_otp_attempt(*, user_id: int) -> int:
    key = f"2fa:fail:{user_id}"
    failures = (safe_cache_get(key, 0) or 0) + 1
    safe_cache_set(key, failures, timeout=900)
    return failures


def clear_failed_otp_attempts(*, user_id: int) -> None:
    safe_cache_delete(f"2fa:fail:{user_id}")
    

def is_otp_temporarily_blocked(*, user_id: int) -> bool:
    block_key = f"2fa:block:{user_id}"
    return bool(safe_cache_get(block_key))



def maybe_block_user_after_failures(*, user_id: int, threshold: int = 10, block_minutes: int = 15) -> None:
    failures = record_failed_otp_attempt(user_id=user_id)
    if failures >= threshold:
        safe_cache_set(f"2fa:block:{user_id}", 1, timeout=block_minutes * 60)
        logger.warning("2FA temporarily blocked", extra={"user_id": user_id, "failures": failures})

def log_suspicious_activity(*, event: str, metadata: dict) -> None:
    logger.warning("Suspicious activity detected", extra={"event": event, "metadata": json.dumps(metadata)})