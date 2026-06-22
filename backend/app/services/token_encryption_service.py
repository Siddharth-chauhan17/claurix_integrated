"""Versioned Fernet encryption for secrets at rest (integration-agnostic)."""

from __future__ import annotations

from functools import lru_cache

from cryptography.fernet import Fernet, InvalidToken

from app.config import get_settings

ENCRYPTION_VERSION_PREFIX = "v1:"


class TokenEncryptionError(Exception):
    """Base encryption/decryption failure."""


class TokenEncryptionMissingKeyError(TokenEncryptionError):
    """Encryption key is not configured."""


class TokenDecryptionError(TokenEncryptionError):
    """Stored token cannot be decrypted (wrong key or corrupted ciphertext)."""


class TokenEncryptionVersionError(TokenEncryptionError):
    """Stored token uses an unsupported encryption version."""


def is_encrypted(value: str | None) -> bool:
    """Return True when value uses the versioned encrypted format."""
    return bool(value) and value.startswith(ENCRYPTION_VERSION_PREFIX)


def validate_encryption_configuration() -> None:
    """Validate key format when encryption is invoked. Does not run at startup."""
    _fernet()


def encrypt_token(plaintext: str) -> str:
    """Encrypt plaintext and return versioned ciphertext (v1:...)."""
    if not plaintext:
        return plaintext
    token = _fernet().encrypt(plaintext.encode("utf-8")).decode("utf-8")
    return f"{ENCRYPTION_VERSION_PREFIX}{token}"


def decrypt_token(stored: str | None) -> str | None:
    """
    Return plaintext for use in API calls.

    Plaintext rows (legacy) are returned unchanged.
    Versioned rows (v1:...) are decrypted.
    """
    if stored is None or stored == "":
        return stored

    if not is_encrypted(stored):
        return stored

    version, _, ciphertext = stored.partition(":")
    if version != "v1" or not ciphertext:
        raise TokenEncryptionVersionError(
            f"Unsupported token encryption version: {version or 'unknown'}"
        )

    try:
        return _fernet().decrypt(ciphertext.encode("utf-8")).decode("utf-8")
    except InvalidToken as exc:
        raise TokenDecryptionError(
            "Stored token cannot be decrypted. "
            "OUTLOOK_TOKEN_ENCRYPTION_KEY may have changed — reconnect Outlook."
        ) from exc


@lru_cache
def _fernet() -> Fernet:
    settings = get_settings()
    key = (settings.outlook_token_encryption_key or "").strip()
    if not key:
        raise TokenEncryptionMissingKeyError(
            "OUTLOOK_TOKEN_ENCRYPTION_KEY is not configured. "
            "Generate one with: "
            'python -c "from cryptography.fernet import Fernet; '
            'print(Fernet.generate_key().decode())"'
        )
    try:
        return Fernet(key.encode("utf-8"))
    except (TypeError, ValueError) as exc:
        raise TokenEncryptionMissingKeyError(
            "OUTLOOK_TOKEN_ENCRYPTION_KEY is invalid for Fernet encryption"
        ) from exc
