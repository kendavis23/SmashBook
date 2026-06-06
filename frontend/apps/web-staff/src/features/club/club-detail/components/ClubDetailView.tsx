import type { Club, OperatingHours, PricingRule } from "../../types";
import type { BookingType } from "../../types";
import { ChevronDown, ChevronRight, CircleCheck, TriangleAlert } from "lucide-react";
import { type JSX, useState } from "react";
import {
    PRICING_LABEL_NAMES,
    SESSION_TYPES,
    SESSION_TYPE_LABELS,
    computeCoverage,
    sessionTypeOf,
    timeToMinutes,
    type Interval,
} from "./pricingRulesConstants";

const DAY_NAMES_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DAY_NAMES_FULL = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
];

export function formatTime(time: string): string {
    const [hourPart = "0", minutePart = "0"] = time.split(":");
    const hour = Number(hourPart);
    const minute = Number(minutePart);

    if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
        return time;
    }

    const period = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 === 0 ? 12 : hour % 12;

    return `${displayHour}:${String(minute).padStart(2, "0")} ${period}`;
}

type Props = {
    club: Club;
    hours: OperatingHours[];
    rules: PricingRule[];
    hoursLoading: boolean;
    rulesLoading: boolean;
    rulesPage: number;
    onRulesPageChange: (page: number) => void;
};

function InfoRow({
    label,
    value,
}: {
    label: string;
    value: string | number | boolean | null | undefined;
}): JSX.Element {
    const display =
        value === null || value === undefined || value === ""
            ? "—"
            : typeof value === "boolean"
              ? value
                  ? "Yes"
                  : "No"
              : String(value);
    return (
        <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/40 px-3 py-2">
            <span className="text-xs text-muted-foreground">{label}</span>
            <span className="text-xs font-semibold text-foreground">{display}</span>
        </div>
    );
}

export default function ClubDetailView({
    club,
    hours,
    rules,
    hoursLoading,
    rulesLoading,
    rulesPage: _rulesPage,
    onRulesPageChange: _onRulesPageChange,
}: Props): JSX.Element {
    const [selectedDay, setSelectedDay] = useState(0);

    return (
        <div className="space-y-5">
            <section>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Booking Rules
                </p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    <InfoRow label="Duration (min)" value={club.booking_duration_minutes} />
                    <InfoRow label="Max advance (days)" value={club.max_advance_booking_days} />
                    <InfoRow label="Min notice (hrs)" value={club.min_booking_notice_hours} />
                    <InfoRow
                        label="Max bookings / player / week"
                        value={club.max_bookings_per_player_per_week}
                    />
                    <InfoRow label="Min players to confirm" value={club.min_players_to_confirm} />
                </div>
            </section>

            <section>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Player Matching
                </p>
                <div className="grid grid-cols-3 gap-2">
                    <InfoRow label="Skill min" value={club.skill_level_min} />
                    <InfoRow label="Skill max" value={club.skill_level_max} />
                    <InfoRow label="Skill range" value={club.skill_range_allowed} />
                </div>
            </section>

            <section>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Cancellations & Reminders
                </p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <InfoRow label="Auto cancel (hrs)" value={club.auto_cancel_hours_before} />
                    <InfoRow label="Notice (hrs)" value={club.cancellation_notice_hours} />
                    <InfoRow label="Refund %" value={club.cancellation_refund_pct} />
                    <InfoRow label="Reminder (hrs)" value={club.reminder_hours_before} />
                </div>
            </section>

            <section>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Features
                </p>
                <div className="grid grid-cols-2 gap-2">
                    <InfoRow label="Open games" value={club.open_games_enabled} />
                    <InfoRow label="Waitlist" value={club.waitlist_enabled} />
                </div>
            </section>

            <section>
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Operating Hours & Pricing Rules
                </p>
                {hoursLoading || rulesLoading ? (
                    <p className="text-xs text-muted-foreground/60">Loading…</p>
                ) : (
                    <div className="space-y-3">
                        {/* Day tabs */}
                        <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
                            {DAY_NAMES_FULL.map((_, i) => {
                                const entry = hours.find((h) => h.day_of_week === i);
                                const isActive = selectedDay === i;
                                return (
                                    <button
                                        key={i}
                                        onClick={() => setSelectedDay(i)}
                                        className={`rounded-lg border px-2 py-2.5 text-center transition-all ${
                                            isActive
                                                ? "border-cta bg-cta/10 shadow-sm"
                                                : entry
                                                  ? "border-border bg-card hover:border-cta/40 hover:bg-cta/5"
                                                  : "border-border/50 bg-muted/20 hover:bg-muted/40"
                                        }`}
                                    >
                                        <p
                                            className={`text-xs font-semibold ${isActive ? "text-cta" : "text-foreground"}`}
                                        >
                                            {DAY_NAMES_SHORT[i]}
                                        </p>
                                        {entry ? (
                                            <p
                                                className={`mt-0.5 text-[10px] leading-tight ${isActive ? "text-cta/80" : "text-muted-foreground"}`}
                                            >
                                                {formatTime(entry.open_time)} –{" "}
                                                {formatTime(entry.close_time)}
                                            </p>
                                        ) : (
                                            <p className="mt-0.5 text-[10px] text-muted-foreground/40">
                                                Closed
                                            </p>
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Session-type groups for the selected day */}
                        <ReadOnlyDayPanel
                            selectedDay={selectedDay}
                            rules={rules}
                            hours={hours}
                            currency={club.currency}
                        />
                    </div>
                )}
            </section>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Read-only day panel — session-type groups with collapse/expand
// ---------------------------------------------------------------------------

function ReadOnlyDayPanel({
    selectedDay,
    rules,
    hours,
    currency,
}: {
    selectedDay: number;
    rules: PricingRule[];
    hours: OperatingHours[];
    currency: string;
}): JSX.Element {
    const dayHours = hours.find((h) => h.day_of_week === selectedDay);
    const openWindow: Interval | null = dayHours
        ? { start: timeToMinutes(dayHours.open_time), end: timeToMinutes(dayHours.close_time) }
        : null;

    const dayRules = rules.filter((r) => r.day_of_week === selectedDay);
    const sessionsWithRules = SESSION_TYPES.filter((st) =>
        dayRules.some((r) => sessionTypeOf(r) === st)
    );

    // Read-only panel: all groups open by default.
    const [collapsed, setCollapsed] = useState<Set<BookingType>>(new Set());

    function toggle(st: BookingType): void {
        setCollapsed((prev) => {
            const next = new Set(prev);
            if (next.has(st)) next.delete(st);
            else next.add(st);
            return next;
        });
    }

    if (sessionsWithRules.length === 0) {
        return (
            <div className="rounded-xl border border-dashed border-border bg-muted/20 px-4 py-8 text-center">
                <p className="text-xs text-muted-foreground/60">
                    No pricing rules for {DAY_NAMES_FULL[selectedDay]}.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {sessionsWithRules.map((st) => {
                const stRules = dayRules.filter((r) => sessionTypeOf(r) === st);
                const activeRanges: Interval[] = stRules
                    .filter((r) => r.is_active)
                    .map((r) => ({
                        start: timeToMinutes(r.start_time),
                        end: timeToMinutes(r.end_time),
                    }));
                const coverage = computeCoverage(activeRanges, openWindow);
                const isOpen = !collapsed.has(st);

                return (
                    <section
                        key={st}
                        className="overflow-hidden rounded-xl border border-border bg-card"
                    >
                        {/* Header */}
                        <div className="flex flex-col gap-3 border-b border-border bg-muted/10 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
                            <button
                                onClick={() => toggle(st)}
                                aria-expanded={isOpen}
                                className="flex min-w-0 items-center gap-2 text-left"
                            >
                                {isOpen ? (
                                    <ChevronDown
                                        size={15}
                                        className="shrink-0 text-muted-foreground"
                                    />
                                ) : (
                                    <ChevronRight
                                        size={15}
                                        className="shrink-0 text-muted-foreground"
                                    />
                                )}
                                <span className="truncate text-sm font-semibold text-foreground">
                                    {SESSION_TYPE_LABELS[st]}
                                </span>
                                <span className="shrink-0 rounded-full border border-border bg-background px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                                    {stRules.length} {stRules.length === 1 ? "rule" : "rules"}
                                </span>
                                <ReadOnlyCoverageBadge
                                    noOpenHours={coverage.noOpenHours}
                                    fullyCovered={coverage.fullyCovered}
                                    hasRules={stRules.length > 0}
                                />
                            </button>

                            {stRules.length > 0 && openWindow ? (
                                <ReadOnlyTimeline
                                    rules={stRules}
                                    openWindow={openWindow}
                                    gaps={coverage.gaps}
                                />
                            ) : null}
                        </div>

                        {/* Rows */}
                        {isOpen ? (
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="border-b border-border bg-muted/30">
                                        <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                            Time
                                        </th>
                                        <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                            Label
                                        </th>
                                        <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                            Price
                                        </th>
                                        <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                            Status
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {stRules.map((r, i) => (
                                        <tr
                                            key={i}
                                            className="border-b border-border/40 last:border-0 hover:bg-muted/20 transition-colors"
                                        >
                                            <td className="px-4 py-2.5">
                                                <span className="font-medium text-foreground whitespace-nowrap">
                                                    {formatTime(r.start_time)} –{" "}
                                                    {formatTime(r.end_time)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-2.5">
                                                <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-secondary-foreground">
                                                    {PRICING_LABEL_NAMES[r.label] ?? r.label}
                                                </span>
                                            </td>
                                            <td className="px-4 py-2.5 font-semibold text-foreground whitespace-nowrap">
                                                {currency} {Number(r.price_per_slot).toFixed(2)}
                                            </td>
                                            <td className="px-4 py-2.5">
                                                <span
                                                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${r.is_active ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}
                                                >
                                                    {r.is_active ? "Active" : "Inactive"}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : null}
                    </section>
                );
            })}
        </div>
    );
}

function ReadOnlyCoverageBadge({
    noOpenHours,
    fullyCovered,
    hasRules,
}: {
    noOpenHours: boolean;
    fullyCovered: boolean;
    hasRules: boolean;
}): JSX.Element | null {
    if (noOpenHours || !hasRules) return null;
    return fullyCovered ? (
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-semibold text-success">
            <CircleCheck size={11} />
            All open hours covered
        </span>
    ) : (
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-warning/15 px-2 py-0.5 text-[10px] font-semibold text-warning">
            <TriangleAlert size={11} />
            Gaps in coverage
        </span>
    );
}

// Timeline scoped to open_time–close_time with 2-hour tick marks.
function ReadOnlyTimeline({
    rules,
    openWindow,
    gaps,
}: {
    rules: PricingRule[];
    openWindow: Interval;
    gaps: Interval[];
}): JSX.Element {
    const rangeMinutes = openWindow.end - openWindow.start;

    // One vertical tick per hour across the full range.
    const hourTicks: number[] = [];
    for (let t = openWindow.start + 60; t < openWindow.end; t += 60) {
        hourTicks.push(t);
    }

    // Single interior label at noon (12P) if it has enough clearance from edges.
    const edgeGuard = rangeMinutes * 0.1;
    const noon = 720; // 12:00 in minutes
    const labelTicks: number[] =
        noon > openWindow.start &&
        noon < openWindow.end &&
        noon - openWindow.start >= edgeGuard &&
        openWindow.end - noon >= edgeGuard
            ? [noon]
            : [];

    function pct(minutes: number): number {
        return ((minutes - openWindow.start) / rangeMinutes) * 100;
    }

    // "7A", "10A", "1P", "10P"
    function toShortLabel(m: number): string {
        const totalH = Math.floor(m / 60);
        const h = totalH % 12 === 0 ? 12 : totalH % 12;
        const suffix = totalH < 12 ? "A" : "P";
        return `${h}${suffix}`;
    }

    return (
        <div className="hidden w-96 shrink-0 md:block">
            {/* Bar */}
            <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted/60">
                {/* Covered segments — single professional blue */}
                {rules
                    .filter((r) => r.is_active)
                    .map((r, i) => {
                        const start = Math.max(timeToMinutes(r.start_time), openWindow.start);
                        const end = Math.min(timeToMinutes(r.end_time), openWindow.end);
                        if (end <= start) return null;
                        return (
                            <div
                                key={i}
                                className="absolute inset-y-0 bg-blue-500/80"
                                style={{
                                    left: `${pct(start)}%`,
                                    width: `${pct(end) - pct(start)}%`,
                                }}
                                title={`${formatTime(r.start_time)} – ${formatTime(r.end_time)}`}
                            />
                        );
                    })}
                {/* Gaps — subtle red */}
                {gaps.map((g, i) => {
                    const start = Math.max(g.start, openWindow.start);
                    const end = Math.min(g.end, openWindow.end);
                    if (end <= start) return null;
                    return (
                        <div
                            key={`gap-${i}`}
                            className="absolute inset-y-0 bg-destructive/35"
                            style={{ left: `${pct(start)}%`, width: `${pct(end) - pct(start)}%` }}
                            title="No pricing for this period"
                        />
                    );
                })}
                {/* One thin tick per hour */}
                {hourTicks.map((t) => (
                    <div
                        key={t}
                        className="absolute inset-y-0 w-px bg-background/40"
                        style={{ left: `${pct(t)}%` }}
                    />
                ))}
            </div>
            {/* Labels: start, every-3h interior, end */}
            <div className="relative mt-1 h-3">
                <span className="absolute left-0 text-[9px] tabular-nums text-muted-foreground/70">
                    {toShortLabel(openWindow.start)}
                </span>
                {labelTicks.map((t) => (
                    <span
                        key={t}
                        className="absolute text-[9px] tabular-nums text-muted-foreground/70"
                        style={{ left: `${pct(t)}%`, transform: "translateX(-50%)" }}
                    >
                        {toShortLabel(t)}
                    </span>
                ))}
                <span className="absolute right-0 text-[9px] tabular-nums text-muted-foreground/70">
                    {toShortLabel(openWindow.end)}
                </span>
            </div>
        </div>
    );
}
