"""Microsoft Graph API client for Outlook mail operations."""



from __future__ import annotations



import time

from datetime import datetime

from pathlib import Path

from typing import Any

from urllib.parse import quote



import requests



from app.config import get_settings

from app.services.outlook_audit_log import log_graph_error



GRAPH_BASE_URL = "https://graph.microsoft.com/v1.0"

DEFAULT_TIMEOUT = 30

MAX_429_RETRIES = 2





FILE_ATTACHMENT_ODATA_TYPE = "#microsoft.graph.fileAttachment"



MESSAGE_LIST_SELECT = (

    "id,subject,from,receivedDateTime,hasAttachments,conversationId,isRead"

)

MESSAGE_DETAIL_SELECT = (

    "id,subject,from,receivedDateTime,bodyPreview,hasAttachments,conversationId"

)

ATTACHMENT_SELECT = "id,name,contentType,size,isInline"





class OutlookGraphError(Exception):

    """Graph API request failed."""



    def __init__(self, message: str, *, status_code: int | None = None) -> None:

        super().__init__(message)

        self.status_code = status_code





class OutlookGraphUnauthorized(OutlookGraphError):

    """Access token rejected by Graph (401)."""





class OutlookGraphForbidden(OutlookGraphError):

    """Insufficient Graph permissions (403)."""





class OutlookGraphNotFound(OutlookGraphError):

    """Resource not found (404)."""





class OutlookGraphRateLimited(OutlookGraphError):

    """Graph throttling (429)."""



    def __init__(

        self,

        message: str,

        *,

        status_code: int = 429,

        retry_after: str | None = None,

    ) -> None:

        super().__init__(message, status_code=status_code)

        self.retry_after = retry_after





class OutlookGraphServerError(OutlookGraphError):

    """Graph server error (5xx)."""





class OutlookAttachmentTooLargeError(OutlookGraphError):

    """Attachment exceeds configured import size limit."""



    def __init__(self, message: str, *, max_mb: int) -> None:

        super().__init__(message, status_code=413)

        self.max_mb = max_mb





def _parse_graph_datetime(value: str | None) -> datetime | None:

    if not value:

        return None

    normalized = value.replace("Z", "+00:00")

    try:

        return datetime.fromisoformat(normalized)

    except ValueError:

        return None





def _sender_fields(from_block: dict[str, Any] | None) -> tuple[str | None, str | None]:

    if not from_block:

        return None, None

    email_address = from_block.get("emailAddress") or {}

    name = email_address.get("name")

    address = email_address.get("address")

    sender_name = str(name).strip() if name else None

    sender_email = str(address).strip() if address else None

    return sender_name, sender_email





def normalize_message_summary(raw: dict[str, Any]) -> dict[str, Any]:

    sender_name, sender_email = _sender_fields(raw.get("from"))

    return {

        "id": raw.get("id") or "",

        "subject": raw.get("subject") or "(No subject)",

        "sender_name": sender_name,

        "sender_email": sender_email,

        "received_at": _parse_graph_datetime(raw.get("receivedDateTime")),

        "has_attachments": bool(raw.get("hasAttachments", False)),

        "conversation_id": raw.get("conversationId"),

    }





def normalize_message_detail(raw: dict[str, Any]) -> dict[str, Any]:

    summary = normalize_message_summary(raw)

    summary["body_preview"] = raw.get("bodyPreview")

    return summary





def _file_extension(name: str | None) -> str | None:

    if not name:

        return None

    suffix = Path(name).suffix.lower()

    return suffix if suffix else None





def _is_file_attachment(raw: dict[str, Any]) -> bool:

    odata_type = raw.get("@odata.type") or raw.get("odata.type") or ""

    return odata_type == FILE_ATTACHMENT_ODATA_TYPE or odata_type.endswith(".fileAttachment")





def normalize_attachment(raw: dict[str, Any]) -> dict[str, Any]:

    name = raw.get("name") or ""

    size = raw.get("size")

    size_bytes: int | None

    try:

        size_bytes = int(size) if size is not None else None

    except (TypeError, ValueError):

        size_bytes = None

    return {

        "id": raw.get("id") or "",

        "name": name,

        "content_type": raw.get("contentType"),

        "size_bytes": size_bytes,

        "is_inline": bool(raw.get("isInline", False)),

        "extension": _file_extension(name),

    }





def _parse_retry_after(value: str | None, attempt: int) -> float:

    if value is not None:

        try:

            return max(float(value), 0.0)

        except ValueError:

            pass

    return min(2 ** attempt, 30.0)





def _raise_for_status(response: requests.Response, path: str) -> None:

    if response.status_code == 401:

        log_graph_error(status_code=401, path=path)

        raise OutlookGraphUnauthorized(

            "Graph access token is invalid or expired",

            status_code=401,

        )

    if response.status_code == 403:

        raise OutlookGraphForbidden(

            "Insufficient Microsoft Graph permissions for mailbox access",

            status_code=403,

        )

    if response.status_code == 404:

        raise OutlookGraphNotFound(

            "Graph resource not found",

            status_code=404,

        )

    if response.status_code == 429:

        log_graph_error(status_code=429, path=path)

        raise OutlookGraphRateLimited(

            "Microsoft Graph rate limit exceeded",

            retry_after=response.headers.get("Retry-After"),

        )

    if response.status_code >= 500:

        log_graph_error(status_code=response.status_code, path=path)

        raise OutlookGraphServerError(

            f"Microsoft Graph server error ({response.status_code})",

            status_code=502,

        )

    if not response.ok:

        raise OutlookGraphError(

            f"Graph request failed ({response.status_code})",

            status_code=response.status_code,

        )





class OutlookGraphService:

    """Read mailbox data via Microsoft Graph."""



    def _request(

        self,

        method: str,

        path: str,

        access_token: str,

        *,

        params: dict[str, Any] | None = None,

        extra_headers: dict[str, str] | None = None,

    ) -> dict[str, Any]:

        url = path if path.startswith("http") else f"{GRAPH_BASE_URL}{path}"



        for attempt in range(MAX_429_RETRIES + 1):

            try:

                response = requests.request(

                    method,

                    url,

                    headers={

                        "Authorization": f"Bearer {access_token}",

                        **(extra_headers or {}),

                    },

                    params=params,

                    timeout=DEFAULT_TIMEOUT,

                )

            except requests.RequestException as exc:

                raise OutlookGraphServerError(

                    f"Graph request failed: {exc}",

                    status_code=502,

                ) from exc



            if response.status_code == 429 and attempt < MAX_429_RETRIES:

                time.sleep(

                    _parse_retry_after(response.headers.get("Retry-After"), attempt)

                )

                continue



            _raise_for_status(response, path)

            payload = response.json()

            if not isinstance(payload, dict):

                raise OutlookGraphError("Unexpected Graph response format")

            return payload



        raise OutlookGraphRateLimited(

            "Microsoft Graph rate limit exceeded after retries",

            retry_after=None,

        )



    def get_current_user(self, access_token: str) -> dict[str, Any]:

        payload = self._request("GET", "/me", access_token)

        microsoft_user_id = payload.get("id") or ""

        email = (payload.get("mail") or payload.get("userPrincipalName") or "").strip()

        display_name = (payload.get("displayName") or "").strip() or None

        return {

            "microsoft_user_id": microsoft_user_id,

            "email": email,

            "display_name": display_name,

        }



    def list_messages(

        self,

        access_token: str,

        *,

        top: int = 25,

        unread_only: bool = False,

    ) -> list[dict[str, Any]]:

        page_size = max(1, min(top, 100))

        params: dict[str, Any] = {

            "$top": page_size,

            "$orderby": "receivedDateTime desc",

            "$select": MESSAGE_LIST_SELECT,

        }

        if unread_only:

            params["$filter"] = "isRead eq false"



        payload = self._request("GET", "/me/messages", access_token, params=params)

        values = payload.get("value") or []

        if not isinstance(values, list):

            return []

        return [normalize_message_summary(item) for item in values if isinstance(item, dict)]



    def search_messages(

        self,

        access_token: str,

        *,

        search_query: str,

        top: int = 50,

    ) -> list[dict[str, Any]]:

        """Search mailbox messages via Graph $search (includes body preview)."""

        query = search_query.strip()

        if not query:

            return []



        page_size = max(1, min(top, 100))

        params: dict[str, Any] = {

            "$search": query,

            "$top": page_size,

            "$select": MESSAGE_DETAIL_SELECT,

        }

        payload = self._request(

            "GET",

            "/me/messages",

            access_token,

            params=params,

            extra_headers={"ConsistencyLevel": "eventual"},

        )

        values = payload.get("value") or []

        if not isinstance(values, list):

            return []

        return [normalize_message_detail(item) for item in values if isinstance(item, dict)]



    def list_messages_with_preview(

        self,

        access_token: str,

        *,

        top: int = 100,

    ) -> list[dict[str, Any]]:

        """List recent inbox messages including body preview for local matching."""

        page_size = max(1, min(top, 100))

        params: dict[str, Any] = {

            "$top": page_size,

            "$orderby": "receivedDateTime desc",

            "$select": MESSAGE_DETAIL_SELECT,

        }

        payload = self._request("GET", "/me/messages", access_token, params=params)

        values = payload.get("value") or []

        if not isinstance(values, list):

            return []

        return [normalize_message_detail(item) for item in values if isinstance(item, dict)]



    def get_message(self, access_token: str, message_id: str) -> dict[str, Any]:

        encoded_id = quote(message_id, safe="")

        path = f"/me/messages/{encoded_id}"

        params = {"$select": MESSAGE_DETAIL_SELECT}

        payload = self._request("GET", path, access_token, params=params)

        return normalize_message_detail(payload)



    def _attachments_path(self, message_id: str, attachment_id: str | None = None) -> str:

        encoded_message_id = quote(message_id, safe="")

        base = f"/me/messages/{encoded_message_id}/attachments"

        if attachment_id is None:

            return base

        encoded_attachment_id = quote(attachment_id, safe="")

        return f"{base}/{encoded_attachment_id}"



    def list_attachments(

        self,

        access_token: str,

        message_id: str,

    ) -> list[dict[str, Any]]:

        params = {"$select": ATTACHMENT_SELECT}

        payload = self._request(

            "GET",

            self._attachments_path(message_id),

            access_token,

            params=params,

        )

        values = payload.get("value") or []

        if not isinstance(values, list):

            return []

        attachments: list[dict[str, Any]] = []

        for item in values:

            if not isinstance(item, dict):

                continue

            if not _is_file_attachment(item):

                continue

            attachments.append(normalize_attachment(item))

        return attachments



    def get_attachment_metadata(

        self,

        access_token: str,

        message_id: str,

        attachment_id: str,

    ) -> dict[str, Any]:

        params = {"$select": ATTACHMENT_SELECT}

        payload = self._request(

            "GET",

            self._attachments_path(message_id, attachment_id),

            access_token,

            params=params,

        )

        if not _is_file_attachment(payload):

            raise OutlookGraphNotFound(

                "Attachment not found or unsupported attachment type",

                status_code=404,

            )

        return normalize_attachment(payload)



    def _request_bytes(

        self,

        path: str,

        access_token: str,

    ) -> bytes:

        url = path if path.startswith("http") else f"{GRAPH_BASE_URL}{path}"



        for attempt in range(MAX_429_RETRIES + 1):

            try:

                response = requests.get(

                    url,

                    headers={"Authorization": f"Bearer {access_token}"},

                    timeout=DEFAULT_TIMEOUT,

                )

            except requests.RequestException as exc:

                raise OutlookGraphServerError(

                    f"Graph download failed: {exc}",

                    status_code=502,

                ) from exc



            if response.status_code == 429 and attempt < MAX_429_RETRIES:

                time.sleep(

                    _parse_retry_after(response.headers.get("Retry-After"), attempt)

                )

                continue



            _raise_for_status(response, path)

            return response.content



        raise OutlookGraphRateLimited(

            "Microsoft Graph rate limit exceeded after retries",

            retry_after=None,

        )



    @staticmethod

    def _max_import_bytes() -> int:

        settings = get_settings()

        return settings.outlook_max_import_size_mb * 1024 * 1024



    @staticmethod

    def _enforce_import_size(metadata: dict[str, Any], *, max_bytes: int) -> None:

        size_bytes = metadata.get("size_bytes")

        max_mb = max(1, get_settings().outlook_max_import_size_mb)

        if size_bytes is not None and size_bytes > max_bytes:

            raise OutlookAttachmentTooLargeError(

                f"Attachment exceeds maximum import size of {max_mb} MB",

                max_mb=max_mb,

            )



    def download_attachment(

        self,

        access_token: str,

        message_id: str,

        attachment_id: str,

        *,

        enforce_import_size: bool = False,

    ) -> dict[str, Any]:

        """Download fileAttachment bytes (metadata + content, not persisted)."""

        metadata = self.get_attachment_metadata(

            access_token,

            message_id,

            attachment_id,

        )

        max_bytes = self._max_import_bytes()

        if enforce_import_size:

            self._enforce_import_size(metadata, max_bytes=max_bytes)



        content_path = f"{self._attachments_path(message_id, attachment_id)}/$value"

        content = self._request_bytes(content_path, access_token)

        if not content:

            raise OutlookGraphError("Downloaded attachment is empty", status_code=502)



        if enforce_import_size and len(content) > max_bytes:

            max_mb = max(1, get_settings().outlook_max_import_size_mb)

            raise OutlookAttachmentTooLargeError(

                f"Attachment exceeds maximum import size of {max_mb} MB",

                max_mb=max_mb,

            )



        return {

            "filename": metadata["name"],

            "content_type": metadata.get("content_type"),

            "bytes": content,

        }

    def _request_json(
        self,
        method: str,
        path: str,
        access_token: str,
        *,
        json_body: dict[str, Any] | None = None,
        extra_headers: dict[str, str] | None = None,
        allow_empty: bool = False,
    ) -> dict[str, Any]:
        """Graph request with JSON body; supports 202/204 empty responses."""
        url = path if path.startswith("http") else f"{GRAPH_BASE_URL}{path}"
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json",
            **(extra_headers or {}),
        }

        for attempt in range(MAX_429_RETRIES + 1):
            try:
                response = requests.request(
                    method,
                    url,
                    headers=headers,
                    json=json_body,
                    timeout=DEFAULT_TIMEOUT,
                )
            except requests.RequestException as exc:
                raise OutlookGraphServerError(
                    f"Graph request failed: {exc}",
                    status_code=502,
                ) from exc

            if response.status_code == 429 and attempt < MAX_429_RETRIES:
                time.sleep(
                    _parse_retry_after(response.headers.get("Retry-After"), attempt)
                )
                continue

            if allow_empty and response.status_code in (202, 204):
                return {}

            _raise_for_status(response, path)
            if not response.content:
                return {}
            payload = response.json()
            if not isinstance(payload, dict):
                raise OutlookGraphError("Unexpected Graph response format")
            return payload

        raise OutlookGraphRateLimited(
            "Microsoft Graph rate limit exceeded after retries",
            retry_after=None,
        )

    def update_draft_message(
        self,
        access_token: str,
        message_id: str,
        message: dict[str, Any],
    ) -> dict[str, Any]:
        """Update an existing Outlook draft (requires Mail.ReadWrite)."""
        encoded_id = quote(message_id, safe="")
        return self._request_json(
            "PATCH",
            f"/me/messages/{encoded_id}",
            access_token,
            json_body=message,
            allow_empty=True,
        )

    def delete_draft_message(self, access_token: str, message_id: str) -> None:
        """Delete an Outlook draft message."""
        encoded_id = quote(message_id, safe="")
        self._request_json(
            "DELETE",
            f"/me/messages/{encoded_id}",
            access_token,
            allow_empty=True,
        )

    def send_mail_message(
        self,
        access_token: str,
        message: dict[str, Any],
        *,
        save_to_sent_items: bool = True,
    ) -> None:
        """Send a message in one operation (requires Mail.Send, not Mail.ReadWrite)."""
        self._request_json(
            "POST",
            "/me/sendMail",
            access_token,
            json_body={
                "message": message,
                "saveToSentItems": save_to_sent_items,
            },
            allow_empty=True,
        )

    def create_draft_message(
        self,
        access_token: str,
        message: dict[str, Any],
    ) -> dict[str, Any]:
        """Create a draft message (returns id + conversationId)."""
        return self._request_json(
            "POST",
            "/me/messages",
            access_token,
            json_body=message,
        )

    def send_draft_message(self, access_token: str, message_id: str) -> None:
        """Send an existing draft message."""
        encoded_id = quote(message_id, safe="")
        self._request_json(
            "POST",
            f"/me/messages/{encoded_id}/send",
            access_token,
            allow_empty=True,
        )

