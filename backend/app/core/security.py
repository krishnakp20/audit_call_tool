import hashlib
from datetime import datetime, timedelta, timezone
from typing import Any, Dict

import bcrypt
from jose import JWTError, jwt

from app.core.config import get_settings

_BCRYPT_SHA256_PREFIX = "bcrypt_sha256$"


def _to_bytes(value: str) -> bytes:
    return value.encode("utf-8")


def _sha256_bytes(password: str) -> bytes:
    return hashlib.sha256(_to_bytes(password)).digest()


def verify_password(plain_password: str, hashed_password: str) -> bool:
    if hashed_password.startswith(_BCRYPT_SHA256_PREFIX):
        encoded_hash = hashed_password[len(_BCRYPT_SHA256_PREFIX) :]
        return bcrypt.checkpw(_sha256_bytes(plain_password), _to_bytes(encoded_hash))

    # Backward compatibility for legacy plain bcrypt hashes.
    try:
        return bcrypt.checkpw(_to_bytes(plain_password), _to_bytes(hashed_password))
    except ValueError:
        # Handle long-password edge case with current bcrypt backend behavior.
        return bcrypt.checkpw(_sha256_bytes(plain_password), _to_bytes(hashed_password))


def get_password_hash(password: str) -> str:
    hashed = bcrypt.hashpw(_sha256_bytes(password), bcrypt.gensalt()).decode("utf-8")
    return f"{_BCRYPT_SHA256_PREFIX}{hashed}"


def create_access_token(subject: str, extra: Dict[str, Any] | None = None) -> str:
    settings = get_settings()
    expires_delta = timedelta(minutes=settings.access_token_expire_minutes)
    expire = datetime.now(timezone.utc) + expires_delta
    to_encode: Dict[str, Any] = {"sub": subject, "exp": expire}
    if extra:
        to_encode.update(extra)
    return jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)


def decode_access_token(token: str) -> Dict[str, Any]:
    settings = get_settings()
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
    except JWTError as exc:
        raise ValueError("Invalid token") from exc
    return payload


def generate_webhook_sha(client_id: int) -> str:
    settings = get_settings()

    raw = f"{client_id}{settings.webhook_secret_key}"

    return hashlib.sha256(raw.encode()).hexdigest()