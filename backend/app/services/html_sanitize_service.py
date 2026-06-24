"""Sanitize HTML email bodies before send."""

from __future__ import annotations

import bleach

ALLOWED_TAGS = [
    "p",
    "br",
    "strong",
    "em",
    "b",
    "i",
    "u",
    "ul",
    "ol",
    "li",
    "a",
    "h1",
    "h2",
    "h3",
    "span",
    "div",
    "blockquote",
]

ALLOWED_ATTRIBUTES = {
    "a": ["href", "title", "target", "rel"],
    "span": ["style"],
    "div": ["style"],
    "p": ["style"],
}


def sanitize_email_html(html: str) -> str:
    cleaned = bleach.clean(
        html or "",
        tags=ALLOWED_TAGS,
        attributes=ALLOWED_ATTRIBUTES,
        strip=True,
    )
    return cleaned.strip() or "<p></p>"
