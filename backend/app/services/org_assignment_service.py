"""
Temporary organization assignment from email domain.

Isolated module — may be replaced by enterprise onboarding, SSO, or admin flows.
"""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.organization import Organization
from app.services.organization_service import create_organization_with_domain, utcnow
from app.utils.ids import PERSONAL_ORG_ID

# Testing-only shared org for Gmail (see product spec)
PERSONAL_ORG_NAME = "Personal"
PERSONAL_DOMAIN = "gmail.com"


def extract_email_domain(email: str) -> str:
    normalized = (email or "").strip().lower()
    if "@" not in normalized:
        raise ValueError("Invalid email address")
    return normalized.rsplit("@", 1)[1]


def domain_to_organization_name(domain: str) -> str:
    """howden.com -> Howden"""
    label = domain.split(".")[0]
    label = label.replace("-", " ").replace("_", " ")
    parts = [p.capitalize() for p in label.split() if p]
    return " ".join(parts) if parts else domain


def is_gmail_testing_domain(domain: str) -> bool:
    return domain in (PERSONAL_DOMAIN, "googlemail.com")


def get_or_create_personal_organization(db: Session) -> Organization:
    org = db.get(Organization, PERSONAL_ORG_ID)
    if org:
        return org
    now = utcnow()
    org = Organization(
        id=PERSONAL_ORG_ID,
        name=PERSONAL_ORG_NAME,
        domain=PERSONAL_DOMAIN,
        created_at=now,
        updated_at=now,
    )
    db.add(org)
    db.flush()
    return org


def resolve_organization_for_email(db: Session, email: str) -> Organization:
    """
    Assign organization from email domain.
    gmail.com / googlemail.com -> shared Personal org (org_personal).
    Company domains -> lookup by domain or create new org.
    """
    domain = extract_email_domain(email)

    if is_gmail_testing_domain(domain):
        return get_or_create_personal_organization(db)

    existing = db.execute(
        select(Organization).where(Organization.domain == domain)
    ).scalar_one_or_none()
    if existing:
        return existing

    name = domain_to_organization_name(domain)
    return create_organization_with_domain(db, domain=domain, name=name)
