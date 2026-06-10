"""Derive display company name from an email domain."""

GENERIC_EMAIL_DOMAINS = frozenset(
    {
        "gmail.com",
        "googlemail.com",
        "yahoo.com",
        "yahoo.co.in",
        "hotmail.com",
        "outlook.com",
        "live.com",
        "icloud.com",
        "proton.me",
        "protonmail.com",
        "rediffmail.com",
    }
)


def company_name_from_email(email: str) -> str:
    """
    Map email domain to a human-readable company label.
    e.g. arjun@acme.com -> Acme, user@gmail.com -> Personal
    """
    normalized = (email or "").strip().lower()
    if "@" not in normalized:
        return "Unknown"

    domain = normalized.rsplit("@", 1)[1]
    if domain in GENERIC_EMAIL_DOMAINS:
        return "Personal"

    label = domain.split(".")[0]
    label = label.replace("-", " ").replace("_", " ")
    return " ".join(part.capitalize() for part in label.split() if part) or "Unknown"
