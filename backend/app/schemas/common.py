"""Shared schema types.

``UtcDatetime`` enforces the repo-wide datetime contract (see CLAUDE.md →
"Datetime & Timezone Convention"): every datetime crossing the API must be
tz-aware, and is normalized to UTC on the way in. Naive datetimes are rejected
with a validation error (``422``) rather than silently treated as UTC.
"""

from datetime import datetime, timezone
from typing import Annotated

from pydantic import AfterValidator


def _require_aware_utc(value: datetime) -> datetime:
    if value.tzinfo is None or value.tzinfo.utcoffset(value) is None:
        raise ValueError(
            "datetime must be timezone-aware (include a UTC offset, e.g. "
            "'2026-06-06T14:00:00Z' or '...+02:00')"
        )
    return value.astimezone(timezone.utc)


# A tz-aware datetime, normalized to UTC. Use everywhere the API accepts an
# instant (booking/court/trainer start/end times, etc.).
UtcDatetime = Annotated[datetime, AfterValidator(_require_aware_utc)]
