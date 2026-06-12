import { MONTHS_SHORT } from "@repo/ui";
import type { CoachSort } from "../types";

/** Rows per page — sent as both `limit` and visible page size. */
export const TABLE_PAGE_SIZE = 10 as const;

/** Sort options offered in the detail-table sort dropdown. */
export const COACH_SORT_OPTIONS: { value: CoachSort; label: string }[] = [
    { value: "sessions", label: "Sessions" },
    { value: "distinct_players", label: "Distinct players" },
    { value: "repeat_players", label: "Repeat players" },
    { value: "return_rate", label: "Return rate" },
    { value: "lesson_revenue", label: "Lesson revenue" },
    { value: "last_session_at", label: "Last session" },
];

/** Heading shown on the detail table for each active sort. */
export const COACH_SORT_TABLE_LABEL: Record<CoachSort, string> = {
    sessions: "Top by Sessions",
    distinct_players: "Top by Distinct Players",
    repeat_players: "Top by Repeat Players",
    return_rate: "Top by Return Rate",
    lesson_revenue: "Top by Lesson Revenue",
    last_session_at: "Recently Active",
};

/** Shared Tailwind class strings for the report's panels and table cells. */
export const panelCls =
    "rounded-2xl border border-border/60 bg-card p-5 shadow-sm ring-1 ring-black/[0.02]";

export const panelTitleCls = "text-sm font-semibold tracking-tight text-foreground";

export const thBase =
    "px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground";

export const tdBase = "px-4 py-3 text-sm tabular-nums text-foreground";

/**
 * Formats a bare `YYYY-MM-DD...` / ISO timestamp from the API as "02 Jun 2026".
 * Parses the date parts directly so the displayed day never shifts by the
 * browser's timezone offset. Returns "—" for null / empty / unparseable input.
 */
export function formatSessionDate(value: string | null): string {
    if (!value) return "—";
    const datePart = value.slice(0, 10);
    const [y, m, d] = datePart.split("-").map(Number);
    if (!y || !m || !d || m < 1 || m > 12) return "—";
    const day = String(d).padStart(2, "0");
    return `${day} ${MONTHS_SHORT[m - 1]} ${y}`;
}

/** UTC-anchored "today" as a millisecond timestamp, used for relative-day maths. */
function todayUtcMidnight(): number {
    const now = new Date();
    return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
}

/**
 * Whole calendar days between `value` and today, or `null` when unparseable.
 * Negative values (future dates) clamp to 0. Compares UTC midnights so the
 * count never drifts by an hour-of-day offset.
 */
export function daysSince(value: string | null): number | null {
    if (!value) return null;
    const datePart = value.slice(0, 10);
    const [y, m, d] = datePart.split("-").map(Number);
    if (!y || !m || !d) return null;
    const then = Date.UTC(y, m - 1, d);
    const diff = Math.floor((todayUtcMidnight() - then) / 86_400_000);
    return diff < 0 ? 0 : diff;
}

/** Human "2 days ago" / "Today" / "Yesterday" label for a last-session date. */
export function relativeSessionLabel(value: string | null): string {
    const days = daysSince(value);
    if (days === null) return "—";
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    return `${days} days ago`;
}

/** Formats a 0–1 return rate as a guarded percentage string ("64%"). */
export function formatReturnRate(rate: number | null | undefined): string {
    const v = Number(rate);
    if (!Number.isFinite(v) || v <= 0) return "0%";
    return `${Math.round(v * 100)}%`;
}

/** A coach's display name, falling back to a placeholder. */
export function coachDisplayName(name: string | null): string {
    const trimmed = name?.trim();
    return trimmed ? trimmed : "Unknown coach";
}

/** Up-to-two-letter initials for the avatar fallback chip. */
export function coachInitials(name: string | null): string {
    const source = (name?.trim() || "?").trim();
    const parts = source.split(/\s+/).filter(Boolean);
    const first = parts[0];
    if (!first) return "?";
    const last = parts[parts.length - 1];
    if (parts.length === 1 || !last) return first.slice(0, 2).toUpperCase();
    return ((first[0] ?? "") + (last[0] ?? "")).toUpperCase();
}

/** Deterministic accent class for an avatar chip, keyed off the seed id. */
const AVATAR_TONES = [
    "bg-cta/15 text-cta",
    "bg-success/15 text-success",
    "bg-info/15 text-info",
    "bg-warning/15 text-warning",
    "bg-secondary text-secondary-foreground",
] as const;

export function avatarTone(seed: string): string {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
    return AVATAR_TONES[Math.abs(hash) % AVATAR_TONES.length] ?? AVATAR_TONES[0];
}
