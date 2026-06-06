"""Timezone helpers — the single conversion point between club-local time and UTC.

Convention (see CLAUDE.md → "Datetime & Timezone Convention"):
- Every datetime on the wire and in the database is **true UTC** (tz-aware).
- Club-local time is purely a parse-in / render-out concern, resolved via
  ``clubs.timezone`` (an IANA name such as ``Europe/London``).
- Never stamp a wall-clock time as UTC (``combine(..., tzinfo=timezone.utc)``).
  Build it in the club's zone and convert with :func:`local_walltime_to_utc`.

The analytics subtree (``app/analytics/services/court_utilisation_service.py``)
already follows this pattern; these helpers make it the shared standard.
"""

from datetime import date as DateType, datetime, time as TimeType, timezone
from zoneinfo import ZoneInfo


def club_tz(club) -> ZoneInfo:
    """Return the IANA timezone for a club as a :class:`ZoneInfo`."""
    return ZoneInfo(club.timezone)


def local_walltime_to_utc(d: DateType, t: TimeType, tz: ZoneInfo) -> datetime:
    """Combine a club-local date + wall-clock time and return the true-UTC instant.

    DST-correct: the wall-clock time is interpreted in ``tz`` first, then shifted
    to UTC, so e.g. 14:00 on a Madrid summer day becomes 12:00Z.
    """
    return datetime.combine(d, t, tzinfo=tz).astimezone(timezone.utc)


def utc_to_local(dt: datetime, tz: ZoneInfo) -> datetime:
    """Convert a true-UTC (tz-aware) datetime into club-local time."""
    return dt.astimezone(tz)
