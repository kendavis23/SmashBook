import { MONTHS_SHORT } from "@repo/ui";
import type { PlayerSort } from "../types";

/** The single leaderboard tab the detail table can show. */
export type PlayerTab = "value";

export const PLAYER_TABS: { id: PlayerTab; label: string }[] = [
    { id: "value", label: "Top by Lifetime Spend" },
];

/** Rows per page — sent as both `limit` and visible page size. */
export const TABLE_PAGE_SIZE = 10 as const;

export const PLAYER_SORT_OPTIONS: { value: PlayerSort; label: string }[] = [
    { value: "lifetime_spend", label: "Lifetime spend" },
    { value: "bookings_played", label: "Bookings played" },
    { value: "last_played_at", label: "Last played" },
];

export const PLAYER_SORT_TAB_LABEL: Record<PlayerSort, string> = {
    lifetime_spend: "Top by Lifetime Spend",
    bookings_played: "Top by Bookings Played",
    last_played_at: "Recently Played",
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
 * browser's timezone offset (see the analytics guide on snapshot dates).
 * Returns "—" for null / empty / unparseable input.
 */
export function formatPlayedDate(value: string | null): string {
    if (!value) return "—";
    const datePart = value.slice(0, 10);
    const [y, m, d] = datePart.split("-").map(Number);
    if (!y || !m || !d || m < 1 || m > 12) return "—";
    const day = String(d).padStart(2, "0");
    return `${day} ${MONTHS_SHORT[m - 1]} ${y}`;
}

/** UTC-anchored "today" as a YYYY-MM-DD string, used for relative-day maths. */
function todayUtcMidnight(): number {
    const now = new Date();
    return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
}

/**
 * Whole calendar days between `value` and today, or `null` when unparseable.
 * Negative values (future dates) clamp to 0. Pure of the local timezone — it
 * compares UTC midnights, so the count never drifts by an hour-of-day offset.
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

/** Human "2 days ago" / "Today" / "Yesterday" label for a last-played date. */
export function relativePlayedLabel(value: string | null): string {
    const days = daysSince(value);
    if (days === null) return "—";
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    return `${days} days ago`;
}

/** A player's display name, falling back to email, then a placeholder. */
export function playerDisplayName(fullName: string | null, email: string | null): string {
    const trimmed = fullName?.trim();
    if (trimmed) return trimmed;
    if (email) return email;
    return "Unknown player";
}

/** Up-to-two-letter initials for the avatar fallback chip. */
export function playerInitials(fullName: string | null, email: string | null): string {
    const source = (fullName?.trim() || email || "?").trim();
    const parts = source.split(/\s+/).filter(Boolean);
    const first = parts[0];
    if (!first) return "?";
    const last = parts[parts.length - 1];
    if (parts.length === 1 || !last) return first.slice(0, 2).toUpperCase();
    return ((first[0] ?? "") + (last[0] ?? "")).toUpperCase();
}

/** Deterministic accent class for an avatar chip, keyed off the user id. */
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
