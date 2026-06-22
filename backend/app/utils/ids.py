"""Secure prefixed identifiers — non-sequential, opaque strings."""

from nanoid import generate

USER_PREFIX = "usr_"
ORG_PREFIX = "org_"
CLIENT_PREFIX = "clt_"
PROJECT_PREFIX = "prj_"
DOCUMENT_PREFIX = "doc_"
QCR_RUN_PREFIX = "qcr_"
OUTLOOK_CONNECTION_PREFIX = "olk_"
PROJECT_EMAIL_IMPORT_PREFIX = "pei_"

# Stable testing org (only exception to random org IDs)
PERSONAL_ORG_ID = "org_personal"


def new_id(prefix: str, size: int = 16) -> str:
    """Generate a prefixed nanoid, e.g. usr_V1StGXR8_Z5jdHi6B."""
    return f"{prefix}{generate(size=size)}"


def new_user_id() -> str:
    return new_id(USER_PREFIX)


def new_org_id() -> str:
    return new_id(ORG_PREFIX)


def new_client_id() -> str:
    return new_id(CLIENT_PREFIX)


def new_project_id() -> str:
    return new_id(PROJECT_PREFIX)


def new_document_id() -> str:
    return new_id(DOCUMENT_PREFIX)


def new_qcr_run_id() -> str:
    return new_id(QCR_RUN_PREFIX)


def new_outlook_connection_id() -> str:
    return new_id(OUTLOOK_CONNECTION_PREFIX)


def new_project_email_import_id() -> str:
    return new_id(PROJECT_EMAIL_IMPORT_PREFIX)


def is_valid_user_id(value: object) -> bool:
    if not isinstance(value, str):
        return False
    s = value.strip()
    if not s.startswith(USER_PREFIX) or len(s) <= len(USER_PREFIX):
        return False
    if s.isdigit() or s[len(USER_PREFIX) :].isdigit():
        return False
    return True


def is_valid_org_id(value: object) -> bool:
    if not isinstance(value, str):
        return False
    s = value.strip()
    return s == PERSONAL_ORG_ID or (
        s.startswith(ORG_PREFIX) and len(s) > len(ORG_PREFIX) and not s[len(ORG_PREFIX) :].isdigit()
    )


def is_valid_project_id(value: object) -> bool:
    if not isinstance(value, str):
        return False
    s = value.strip()
    return (
        s.startswith(PROJECT_PREFIX)
        and len(s) > len(PROJECT_PREFIX)
        and not s[len(PROJECT_PREFIX) :].isdigit()
    )


def is_valid_client_id(value: object) -> bool:
    if not isinstance(value, str):
        return False
    s = value.strip()
    return (
        s.startswith(CLIENT_PREFIX)
        and len(s) > len(CLIENT_PREFIX)
        and not s[len(CLIENT_PREFIX) :].isdigit()
    )
