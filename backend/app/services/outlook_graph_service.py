"""Microsoft Graph API client for Outlook mail operations."""

from __future__ import annotations

from typing import Any


class OutlookGraphService:
    """Read mailbox data via Microsoft Graph."""

    def get_current_user(self, access_token: str) -> dict[str, Any]:
        raise NotImplementedError

    def list_messages(
        self,
        access_token: str,
        *,
        top: int = 50,
        search: str | None = None,
    ) -> dict[str, Any]:
        raise NotImplementedError

    def get_message(self, access_token: str, message_id: str) -> dict[str, Any]:
        raise NotImplementedError

    def list_attachments(
        self,
        access_token: str,
        message_id: str,
    ) -> dict[str, Any]:
        raise NotImplementedError
