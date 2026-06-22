"""In-flight and short-TTL deduplication for Outlook attachment imports."""

from __future__ import annotations

import threading
import time
from dataclasses import dataclass
from typing import Callable, TypeVar

T = TypeVar("T")

_COMPLETED_TTL_SECONDS = 90


@dataclass(frozen=True)
class CachedImportResult:
    document_id: str
    file_name: str
    document_type: str


_global_lock = threading.Lock()
_key_locks: dict[str, threading.Lock] = {}
_completed: dict[str, tuple[float, CachedImportResult]] = {}


def _cache_key(project_id: str, message_id: str, attachment_id: str) -> str:
    return f"{project_id}:{message_id}:{attachment_id}"


def _purge_expired(now: float) -> None:
    expired = [
        key
        for key, (expires_at, _) in _completed.items()
        if expires_at <= now
    ]
    for key in expired:
        _completed.pop(key, None)


def _get_key_lock(key: str) -> threading.Lock:
    with _global_lock:
        lock = _key_locks.get(key)
        if lock is None:
            lock = threading.Lock()
            _key_locks[key] = lock
        return lock


def get_recent_import(
    project_id: str,
    message_id: str,
    attachment_id: str,
) -> CachedImportResult | None:
    key = _cache_key(project_id, message_id, attachment_id)
    now = time.monotonic()
    with _global_lock:
        _purge_expired(now)
        entry = _completed.get(key)
        if entry is None:
            return None
        expires_at, result = entry
        if expires_at <= now:
            _completed.pop(key, None)
            return None
        return result


def remember_import(
    project_id: str,
    message_id: str,
    attachment_id: str,
    *,
    document_id: str,
    file_name: str,
    document_type: str,
) -> None:
    key = _cache_key(project_id, message_id, attachment_id)
    expires_at = time.monotonic() + _COMPLETED_TTL_SECONDS
    result = CachedImportResult(
        document_id=document_id,
        file_name=file_name,
        document_type=document_type,
    )
    with _global_lock:
        _completed[key] = (expires_at, result)


def run_import_once(
    project_id: str,
    message_id: str,
    attachment_id: str,
    import_fn: Callable[[], T],
    *,
    remember_fn: Callable[[T], None] | None = None,
) -> tuple[T, bool]:
    """
    Serialize imports for the same attachment key; return cached result on rapid replay.

    Returns (result, deduplicated).
    """
    cached = get_recent_import(project_id, message_id, attachment_id)
    if cached is not None:
        raise DuplicateImportCacheHit(cached)

    key = _cache_key(project_id, message_id, attachment_id)
    key_lock = _get_key_lock(key)
    with key_lock:
        cached = get_recent_import(project_id, message_id, attachment_id)
        if cached is not None:
            raise DuplicateImportCacheHit(cached)
        result = import_fn()
        if remember_fn is not None:
            remember_fn(result)
        return result, False


class DuplicateImportCacheHit(Exception):
    """Raised when a recent import for the same attachment is already cached."""

    def __init__(self, cached: CachedImportResult) -> None:
        super().__init__("Duplicate import within TTL window")
        self.cached = cached
