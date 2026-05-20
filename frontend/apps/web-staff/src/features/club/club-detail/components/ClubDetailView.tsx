import type { Club, OperatingHours, PricingRule } from "../../types";
import { type JSX, useState } from "react";

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
    const dayRules = rules.filter((r) => r.day_of_week === selectedDay);

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
                        {/* Day cards — act as tabs */}
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

                        {/* Selected day detail panel */}
                        <div className="rounded-xl border border-border bg-card overflow-hidden">
                            {/* Day header */}
                            {(() => {
                                const entry = hours.find((h) => h.day_of_week === selectedDay);
                                return (
                                    <div className="flex items-center gap-3 border-b border-border px-4 py-3 bg-muted/20">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-semibold text-foreground">
                                                    {DAY_NAMES_FULL[selectedDay]}
                                                </span>
                                                {entry ? (
                                                    <span className="rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-semibold text-success">
                                                        Open
                                                    </span>
                                                ) : (
                                                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                                                        Closed
                                                    </span>
                                                )}
                                            </div>
                                            <p className="mt-0.5 text-xs text-muted-foreground">
                                                {entry
                                                    ? `${formatTime(entry.open_time)} – ${formatTime(entry.close_time)}`
                                                    : "No operating hours set"}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* Pricing rules table */}
                            {dayRules.length === 0 ? (
                                <div className="px-4 py-8 text-center">
                                    <p className="text-xs text-muted-foreground/60">
                                        No pricing rules for {DAY_NAMES_FULL[selectedDay]}.
                                    </p>
                                </div>
                            ) : (
                                <table className="w-full text-xs">
                                    <thead>
                                        <tr className="border-b border-border bg-muted/30">
                                            <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                                Label
                                            </th>
                                            <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                                Day
                                            </th>
                                            <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                                Time
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
                                        {dayRules.map((r, i) => (
                                            <tr
                                                key={i}
                                                className="border-b border-border/40 last:border-0 hover:bg-muted/20 transition-colors"
                                            >
                                                <td className="px-4 py-3 font-medium text-foreground">
                                                    {r.label}
                                                </td>
                                                <td className="px-4 py-3 text-muted-foreground">
                                                    {DAY_NAMES_FULL[r.day_of_week]}
                                                </td>
                                                <td className="px-4 py-3 text-muted-foreground">
                                                    {formatTime(r.start_time)} –{" "}
                                                    {formatTime(r.end_time)}
                                                </td>
                                                <td className="px-4 py-3 font-semibold text-foreground">
                                                    {club.currency}{" "}
                                                    {Number(r.price_per_slot).toFixed(2)}
                                                </td>
                                                <td className="px-4 py-3">
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
                            )}
                        </div>
                    </div>
                )}
            </section>
        </div>
    );
}
