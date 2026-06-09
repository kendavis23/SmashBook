"""
Unit tests for app.core.permissions — the central capability matrix.

Two concerns:
  - can() / max_grantable_rank() behave per the matrix and rank ordering.
  - The four access tiers reproduce *exactly* the legacy require_* role sets
    (behavior-preserving guarantee for Phase A).
"""
from app.core.permissions import (
    CAPABILITIES,
    ROLE_RANK,
    Capability,
    can,
    max_grantable_rank,
)
from app.db.models.staff import StaffRole
from app.db.models.user import TenantUserRole


# The role sets the require_* dependencies enforced before centralization.
_LEGACY_STAFF_ROLES = {
    TenantUserRole.owner,
    TenantUserRole.admin,
    TenantUserRole.staff,
    TenantUserRole.trainer,
    TenantUserRole.ops_lead,
}
_LEGACY_OPS_LEAD_ROLES = {TenantUserRole.owner, TenantUserRole.admin, TenantUserRole.ops_lead}
_LEGACY_ADMIN_ROLES = {TenantUserRole.owner, TenantUserRole.admin}
_LEGACY_OWNER_ROLES = {TenantUserRole.owner}


# ---------------------------------------------------------------------------
# Access tiers reproduce the legacy require_* role sets exactly
# ---------------------------------------------------------------------------


def _tenant_roles_with(capability: Capability) -> set[TenantUserRole]:
    return {r for r in TenantUserRole if can(r, capability)}


def test_access_staff_matches_legacy_staff_roles():
    assert _tenant_roles_with(Capability.ACCESS_STAFF) == _LEGACY_STAFF_ROLES


def test_access_ops_lead_matches_legacy_ops_lead_roles():
    assert _tenant_roles_with(Capability.ACCESS_OPS_LEAD) == _LEGACY_OPS_LEAD_ROLES


def test_access_admin_matches_legacy_admin_roles():
    assert _tenant_roles_with(Capability.ACCESS_ADMIN) == _LEGACY_ADMIN_ROLES


def test_access_owner_matches_legacy_owner_roles():
    assert _tenant_roles_with(Capability.ACCESS_OWNER) == _LEGACY_OWNER_ROLES


# ---------------------------------------------------------------------------
# can()
# ---------------------------------------------------------------------------


def test_can_accepts_enum_member():
    assert can(TenantUserRole.owner, Capability.STAFF_INVITE) is True
    assert can(TenantUserRole.player, Capability.STAFF_INVITE) is False


def test_can_accepts_raw_value_string():
    assert can("ops_lead", Capability.STAFF_INVITE) is True
    assert can("viewer", Capability.ACCESS_STAFF) is False


def test_can_spans_both_planes_by_value():
    # A club-plane StaffRole.admin resolves to the same authority as tenant admin.
    assert can(StaffRole.admin, Capability.STAFF_INVITE) is True
    assert can(StaffRole.front_desk, Capability.STAFF_INVITE) is False
    assert can(StaffRole.front_desk, Capability.ACCESS_STAFF) is True


def test_can_unknown_role_has_no_capabilities():
    assert can("nonsense", Capability.ACCESS_STAFF) is False
    assert can(None, Capability.STAFF_INVITE) is False


def test_onboarding_verbs_held_by_owner_admin_ops_lead_only():
    for verb in (
        Capability.STAFF_INVITE,
        Capability.STAFF_VIEW,
        Capability.STAFF_UPDATE_ROLE,
        Capability.STAFF_DEACTIVATE,
    ):
        holders = {v for v in ROLE_RANK if can(v, verb)}
        assert holders == {"owner", "admin", "ops_lead"}


# ---------------------------------------------------------------------------
# ROLE_RANK / max_grantable_rank()
# ---------------------------------------------------------------------------


def test_role_rank_ordering():
    assert (
        ROLE_RANK["owner"]
        > ROLE_RANK["admin"]
        > ROLE_RANK["ops_lead"]
        > ROLE_RANK["trainer"]
        > ROLE_RANK["player"]
    )
    assert ROLE_RANK["trainer"] == ROLE_RANK["front_desk"] == ROLE_RANK["staff"]
    assert ROLE_RANK["player"] == ROLE_RANK["viewer"]


def test_max_grantable_rank_is_one_below_own():
    # An ops_lead (rank 3) may grant trainer/front_desk (rank 2) but not ops_lead.
    assert max_grantable_rank("ops_lead") == 2
    assert ROLE_RANK["trainer"] <= max_grantable_rank("ops_lead")
    assert ROLE_RANK["ops_lead"] > max_grantable_rank("ops_lead")


def test_max_grantable_rank_admin_cannot_grant_admin_owner_can():
    assert max_grantable_rank("admin") == 3  # below admin/owner
    assert ROLE_RANK["admin"] > max_grantable_rank("admin")
    assert ROLE_RANK["admin"] <= max_grantable_rank("owner")
    assert ROLE_RANK["owner"] > max_grantable_rank("owner")


def test_max_grantable_rank_accepts_enum():
    assert max_grantable_rank(TenantUserRole.ops_lead) == 2


def test_max_grantable_rank_unknown_role_grants_nothing():
    assert max_grantable_rank("nonsense") == -1


def test_every_capabilities_role_is_ranked():
    # No role should appear in one table but not the other.
    assert set(CAPABILITIES) == set(ROLE_RANK)
