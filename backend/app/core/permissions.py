"""
Central permission model — single source of truth for role authority.

SmashBook has two role planes that historically each carried their own
hard-coded role-set literals:

- **Tenant plane** — ``users.role`` (:class:`~app.db.models.user.TenantUserRole`):
  ``owner``/``admin``/``staff``/``trainer``/``ops_lead``/``viewer``/``player``.
  This is the only thing today's authz dependencies check.
- **Club plane** — ``staff_profiles.role`` (:class:`~app.db.models.staff.StaffRole`):
  ``trainer``/``ops_lead``/``admin``/``front_desk`` — per-club authority,
  consumed by the Phase B club-context resolver.

Both planes share role *names* by value (``admin`` means the same kind of
authority whether it lands on a tenant user or a club staff profile), so this
module keys everything by the role **value string**. That gives one ordering
(:data:`ROLE_RANK`) and one capability matrix (:data:`CAPABILITIES`) spanning
both planes.

Phase A is behavior-preserving: the four access tiers below
(``ACCESS_STAFF``/``ACCESS_OPS_LEAD``/``ACCESS_ADMIN``/``ACCESS_OWNER``)
reproduce exactly the role sets that ``require_staff``/``require_ops_lead``/
``require_admin``/``require_owner`` used to enforce inline. The onboarding
verbs (``STAFF_INVITE`` etc.) are added now but only consumed in Phase B.
"""
from __future__ import annotations

import enum


def _role_value(role) -> str:
    """Normalize an enum member or raw string to its role value string."""
    return getattr(role, "value", role)


class Capability(str, enum.Enum):
    """Discrete permissions checked via :func:`can`.

    Two families:
    - **Access tiers** mirror the legacy ``require_*`` dependency gates.
    - **Staff-onboarding verbs** are scoped to the Phase B onboarding feature;
      more verbs (booking override, pricing, etc.) get added incrementally.
    """

    # Access tiers (behavior-preserving replacements for require_* role sets)
    ACCESS_STAFF = "access_staff"
    ACCESS_OPS_LEAD = "access_ops_lead"
    ACCESS_ADMIN = "access_admin"
    ACCESS_OWNER = "access_owner"

    # Staff-onboarding verbs (consumed in Phase B)
    STAFF_INVITE = "staff_invite"
    STAFF_VIEW = "staff_view"
    STAFF_UPDATE_ROLE = "staff_update_role"
    STAFF_DEACTIVATE = "staff_deactivate"


# One ordering across both planes. Keyed by role value string so a tenant
# `admin` and a club `admin` rank identically.
#   owner(5) > admin(4) > ops_lead(3) > trainer/front_desk/staff(2) > player/viewer(1)
ROLE_RANK: dict[str, int] = {
    "owner": 5,
    "admin": 4,
    "ops_lead": 3,
    "trainer": 2,
    "front_desk": 2,
    "staff": 2,
    "viewer": 1,
    "player": 1,
}


# Capability matrix. Keyed by role value string; spans both planes.
# Higher tiers are listed with every lower access tier they imply so that the
# four require_* gates collapse to a single source of truth.
_ONBOARDING_VERBS: set[Capability] = {
    Capability.STAFF_INVITE,
    Capability.STAFF_VIEW,
    Capability.STAFF_UPDATE_ROLE,
    Capability.STAFF_DEACTIVATE,
}

CAPABILITIES: dict[str, set[Capability]] = {
    "owner": {
        Capability.ACCESS_STAFF,
        Capability.ACCESS_OPS_LEAD,
        Capability.ACCESS_ADMIN,
        Capability.ACCESS_OWNER,
        *_ONBOARDING_VERBS,
    },
    "admin": {
        Capability.ACCESS_STAFF,
        Capability.ACCESS_OPS_LEAD,
        Capability.ACCESS_ADMIN,
        *_ONBOARDING_VERBS,
    },
    "ops_lead": {
        Capability.ACCESS_STAFF,
        Capability.ACCESS_OPS_LEAD,
        *_ONBOARDING_VERBS,
    },
    "trainer": {Capability.ACCESS_STAFF},
    "staff": {Capability.ACCESS_STAFF},
    "front_desk": {Capability.ACCESS_STAFF},
    "viewer": set(),
    "player": set(),
}


def can(effective_role, capability: Capability) -> bool:
    """Return whether ``effective_role`` holds ``capability``.

    ``effective_role`` may be a :class:`TenantUserRole`/:class:`StaffRole`
    member or a raw role value string. An unknown role has no capabilities.
    """
    return capability in CAPABILITIES.get(_role_value(effective_role), set())


def max_grantable_rank(role) -> int:
    """Highest rank a holder of ``role`` may grant to someone else.

    Always one tier below their own rank — an ops_lead can grant
    trainer/front_desk but never another ops_lead, admin, or owner. Used by the
    Phase B escalation guard. An unknown role grants nothing (returns ``-1``).
    """
    rank = ROLE_RANK.get(_role_value(role))
    return rank - 1 if rank is not None else -1
