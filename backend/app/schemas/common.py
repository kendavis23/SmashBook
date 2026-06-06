"""Shared schema types.

These enforce the repo-wide datetime parse-in contract (see CLAUDE.md →
"Datetime & Timezone Convention"). The frontend is **never** required to attach
a UTC offset: naive (offset-less) datetimes are accepted, offset-aware ones are
honored and normalized to UTC. How a naive value resolves depends on scope:

- ``ClubLocalDatetime`` — for **club-scoped** inputs. Offset-aware values are
  converted to UTC here; naive values are passed through unchanged so the
  endpoint can interpret them in the club's timezone via
  ``app.core.timezones.ensure_utc(dt, club_tz)``. This is a two-layer contract:
  the schema can't see the club, so the endpoint finishes the conversion.
- ``UtcCoercedDatetime`` — for **non-club-scoped** inputs (tenant/billing — no
  single club zone). Offset-aware values are converted to UTC; naive values are
  stamped UTC. Used for billing anchors like ``subscription_start_date``.

``date``-typed inputs need neither type — a bare calendar date carries no
offset and is already interpreted as a club-local day downstream.
"""

from datetime import datetime, timezone
from typing import Annotated, Optional

from pydantic import AfterValidator


def _aware_to_utc_or_none(value: datetime) -> Optional[datetime]:
    """Return the value as UTC if it is offset-aware, else ``None``."""
    if value.tzinfo is not None and value.tzinfo.utcoffset(value) is not None:
        return value.astimezone(timezone.utc)
    return None


def _normalize_or_passthrough(value: datetime) -> datetime:
    # Club-scoped: aware -> UTC now; naive -> passed through unchanged. The
    # endpoint localizes the naive value with the club tz via
    # app.core.timezones.ensure_utc().
    return _aware_to_utc_or_none(value) or value


def _coerce_utc(value: datetime) -> datetime:
    # Non-club-scoped: aware -> UTC; naive -> stamped UTC (billing anchor).
    return _aware_to_utc_or_none(value) or value.replace(tzinfo=timezone.utc)


# Club-scoped instant. Naive values are interpreted as club-local by the
# endpoint (which has clubs.timezone in scope); aware values are UTC-normalized.
ClubLocalDatetime = Annotated[datetime, AfterValidator(_normalize_or_passthrough)]

# Non-club-scoped instant. Naive values are treated as UTC; aware values are
# UTC-normalized. Use for tenant/billing inputs with no single club zone.
UtcCoercedDatetime = Annotated[datetime, AfterValidator(_coerce_utc)]
