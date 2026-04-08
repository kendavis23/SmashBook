import { useState } from "react";
import { useGetOperatingHours, useGetPricingRules } from "../hooks";
import type { Club, OperatingHours, PricingRule } from "../types";
import type { JSX } from "react";

const RULES_PER_PAGE = 7;

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

type Props = { club: Club; clubId: string };

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

export default function ClubDetailViewSection({ club, clubId }: Props): JSX.Element {
    const [rulesPage, setRulesPage] = useState(0);
    const { data: hoursData = [], isLoading: hoursLoading } = useGetOperatingHours(clubId);
    const { data: rulesData = [], isLoading: rulesLoading } = useGetPricingRules(clubId);
    const hours = hoursData as OperatingHours[];
    const rules = rulesData as PricingRule[];
    const totalPages = Math.ceil(rules.length / RULES_PER_PAGE);
    const pagedRules = rules.slice(rulesPage * RULES_PER_PAGE, (rulesPage + 1) * RULES_PER_PAGE);

    return (
        <div className="space-y-5">
            {/* Booking Rules */}
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

            {/* Player Matching */}
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

            {/* Cancellations */}
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

            {/* Features */}
            <section>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Features
                </p>
                <div className="grid grid-cols-2 gap-2">
                    <InfoRow label="Open games" value={club.open_games_enabled} />
                    <InfoRow label="Waitlist" value={club.waitlist_enabled} />
                </div>
            </section>

            {/* Operating Hours */}
            <section>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Operating Hours
                </p>
                {hoursLoading ? (
                    <p className="text-xs text-muted-foreground/60">Loading…</p>
                ) : (
                    <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-7">
                        {DAY_NAMES_FULL.map((_, i) => {
                            const entry = hours.find((h) => h.day_of_week === i);
                            return (
                                <div
                                    key={i}
                                    className={`rounded-lg border px-2 py-2 text-center ${
                                        entry
                                            ? "border-cta/20 bg-cta/5"
                                            : "border-border/50 bg-muted/30"
                                    }`}
                                >
                                    <p className="text-xs font-semibold text-muted-foreground">
                                        {DAY_NAMES_SHORT[i]}
                                    </p>
                                    {entry ? (
                                        <p className="mt-0.5 text-xs font-medium text-cta">
                                            {entry.open_time}–{entry.close_time}
                                        </p>
                                    ) : (
                                        <p className="mt-0.5 text-xs text-muted-foreground/50">
                                            Closed
                                        </p>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </section>

            {/* Pricing Rules */}
            <section>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Pricing Rules
                </p>
                {rulesLoading ? (
                    <p className="text-xs text-muted-foreground/60">Loading…</p>
                ) : rules.length === 0 ? (
                    <p className="text-xs text-muted-foreground/60">No pricing rules configured.</p>
                ) : (
                    <>
                        <div className="overflow-x-auto rounded-lg border border-border">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="border-b border-border bg-muted/50">
                                        <th className="px-3 py-2.5 text-left font-semibold text-muted-foreground">
                                            Label
                                        </th>
                                        <th className="px-3 py-2.5 text-left font-semibold text-muted-foreground">
                                            Day
                                        </th>
                                        <th className="px-3 py-2.5 text-left font-semibold text-muted-foreground">
                                            Time
                                        </th>
                                        <th className="px-3 py-2.5 text-left font-semibold text-muted-foreground">
                                            Price
                                        </th>
                                        <th className="px-3 py-2.5 text-left font-semibold text-muted-foreground">
                                            Status
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pagedRules.map((r, i) => (
                                        <tr
                                            key={i}
                                            className="border-b border-border/50 last:border-0 hover:bg-muted/20"
                                        >
                                            <td className="px-3 py-2 font-medium text-foreground">
                                                {r.label}
                                            </td>
                                            <td className="px-3 py-2 text-muted-foreground">
                                                {DAY_NAMES_FULL[r.day_of_week]}
                                            </td>
                                            <td className="px-3 py-2 text-muted-foreground">
                                                {r.start_time}–{r.end_time}
                                            </td>
                                            <td className="px-3 py-2 font-medium text-foreground">
                                                {club.currency} {r.price_per_slot}
                                            </td>
                                            <td className="px-3 py-2">
                                                <span
                                                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                                                        r.is_active
                                                            ? "bg-success/15 text-success"
                                                            : "bg-muted text-muted-foreground"
                                                    }`}
                                                >
                                                    {r.is_active ? "Active" : "Inactive"}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {totalPages > 1 && (
                            <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                                <span>
                                    Page {rulesPage + 1} of {totalPages}
                                </span>
                                <div className="flex gap-1">
                                    <button
                                        onClick={() => setRulesPage((p) => p - 1)}
                                        disabled={rulesPage === 0}
                                        className="rounded border border-border px-2 py-1 disabled:opacity-40 hover:bg-muted/50"
                                    >
                                        Prev
                                    </button>
                                    <button
                                        onClick={() => setRulesPage((p) => p + 1)}
                                        disabled={rulesPage === totalPages - 1}
                                        className="rounded border border-border px-2 py-1 disabled:opacity-40 hover:bg-muted/50"
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </section>
        </div>
    );
}
