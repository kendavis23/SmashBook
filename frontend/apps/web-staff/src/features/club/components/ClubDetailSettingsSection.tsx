import type { ClubSettingsInput } from "../types";
import type { JSX } from "react";

import { FormField, Toggle } from "@repo/ui";
import { fieldCls, labelCls, fieldWrapperCls } from "./pricingRulesConstants";

type Props = {
    form: ClubSettingsInput;
    onChange: (key: keyof ClubSettingsInput, value: unknown) => void;
};

export default function ClubSettingsTable({ form, onChange }: Props): JSX.Element {
    return (
        <div className="space-y-4">
            <section className="form-section">
                <div className="mb-4">
                    <h3 className="text-sm font-semibold text-foreground">Booking rules</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Control booking timing, limits, and match confirmation requirements.
                    </p>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                    <FormField
                        label="Booking Duration (minutes)"
                        className={fieldWrapperCls}
                        labelClassName={labelCls}
                    >
                        <input
                            required
                            type="number"
                            step="1"
                            min="0"
                            value={form.booking_duration_minutes ?? ""}
                            onChange={(e) =>
                                onChange("booking_duration_minutes", Number(e.target.value))
                            }
                            className={fieldCls}
                        />
                    </FormField>

                    <FormField
                        label="Max Advance Booking Days"
                        className={fieldWrapperCls}
                        labelClassName={labelCls}
                    >
                        <input
                            required
                            type="number"
                            step="1"
                            min="0"
                            value={form.max_advance_booking_days ?? ""}
                            onChange={(e) =>
                                onChange("max_advance_booking_days", Number(e.target.value))
                            }
                            className={fieldCls}
                        />
                    </FormField>

                    <FormField
                        label="Min Booking Notice (hours)"
                        className={fieldWrapperCls}
                        labelClassName={labelCls}
                    >
                        <input
                            required
                            type="number"
                            step="1"
                            min="0"
                            value={form.min_booking_notice_hours ?? ""}
                            onChange={(e) =>
                                onChange("min_booking_notice_hours", Number(e.target.value))
                            }
                            className={fieldCls}
                        />
                    </FormField>

                    <FormField
                        label="Max Bookings / Player / Week"
                        className={fieldWrapperCls}
                        labelClassName={labelCls}
                    >
                        <input
                            required
                            type="number"
                            step="1"
                            min="0"
                            value={form.max_bookings_per_player_per_week ?? ""}
                            onChange={(e) =>
                                onChange(
                                    "max_bookings_per_player_per_week",
                                    e.target.value ? Number(e.target.value) : null
                                )
                            }
                            className={fieldCls}
                        />
                    </FormField>

                    <FormField
                        label="Min Players to Confirm"
                        className={fieldWrapperCls}
                        labelClassName={labelCls}
                    >
                        <input
                            required
                            type="number"
                            step="1"
                            min="0"
                            value={form.min_players_to_confirm ?? ""}
                            onChange={(e) =>
                                onChange("min_players_to_confirm", Number(e.target.value))
                            }
                            className={fieldCls}
                        />
                    </FormField>
                </div>
            </section>

            <section className="form-section">
                <div className="mb-4">
                    <h3 className="text-sm font-semibold text-foreground">Player matching</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Set skill thresholds for who can join and how wide the allowed range can be.
                    </p>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                    <FormField
                        label="Skill Level Min"
                        className={fieldWrapperCls}
                        labelClassName={labelCls}
                    >
                        <input
                            required
                            type="number"
                            step="0.1"
                            min="0"
                            value={form.skill_level_min ?? ""}
                            onChange={(e) => onChange("skill_level_min", Number(e.target.value))}
                            className={fieldCls}
                        />
                    </FormField>

                    <FormField
                        label="Skill Level Max"
                        className={fieldWrapperCls}
                        labelClassName={labelCls}
                    >
                        <input
                            required
                            type="number"
                            step="0.1"
                            min="0"
                            value={form.skill_level_max ?? ""}
                            onChange={(e) => onChange("skill_level_max", Number(e.target.value))}
                            className={fieldCls}
                        />
                    </FormField>

                    <FormField
                        label="Skill Range Allowed"
                        className={fieldWrapperCls}
                        labelClassName={labelCls}
                    >
                        <input
                            type="number"
                            step="0.1"
                            min="0"
                            value={form.skill_range_allowed ?? ""}
                            onChange={(e) =>
                                onChange("skill_range_allowed", Number(e.target.value))
                            }
                            className={fieldCls}
                        />
                    </FormField>
                </div>
            </section>

            <section className="form-section">
                <div className="mb-4">
                    <h3 className="text-sm font-semibold text-foreground">
                        Cancellations and reminders
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Define cancellation timing, refund rules, and reminder delivery.
                    </p>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                    <FormField
                        label="Auto Cancel (hours before)"
                        className={fieldWrapperCls}
                        labelClassName={labelCls}
                    >
                        <input
                            required
                            type="number"
                            step="1"
                            min="0"
                            value={form.auto_cancel_hours_before ?? ""}
                            onChange={(e) =>
                                onChange("auto_cancel_hours_before", Number(e.target.value))
                            }
                            className={fieldCls}
                        />
                    </FormField>

                    <FormField
                        label="Cancellation Notice (hours)"
                        className={fieldWrapperCls}
                        labelClassName={labelCls}
                    >
                        <input
                            required
                            type="number"
                            step="1"
                            min="0"
                            value={form.cancellation_notice_hours ?? ""}
                            onChange={(e) =>
                                onChange("cancellation_notice_hours", Number(e.target.value))
                            }
                            className={fieldCls}
                        />
                    </FormField>

                    <FormField
                        label="Refund %"
                        className={fieldWrapperCls}
                        labelClassName={labelCls}
                    >
                        <input
                            required
                            type="number"
                            step="1"
                            min="0"
                            value={form.cancellation_refund_pct ?? ""}
                            onChange={(e) =>
                                onChange("cancellation_refund_pct", Number(e.target.value))
                            }
                            className={fieldCls}
                        />
                    </FormField>

                    <FormField
                        label="Reminder (hours before)"
                        className={fieldWrapperCls}
                        labelClassName={labelCls}
                    >
                        <input
                            required
                            type="number"
                            step="1"
                            min="0"
                            max="24"
                            value={form.reminder_hours_before ?? ""}
                            onChange={(e) =>
                                onChange("reminder_hours_before", Number(e.target.value))
                            }
                            className={fieldCls}
                        />
                    </FormField>
                </div>
            </section>

            <section className="form-section">
                <div className="mb-4">
                    <h3 className="text-sm font-semibold text-foreground">Features</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Turn club features on or off without changing the rest of the configuration.
                    </p>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3">
                        <span className="text-sm text-foreground">Open Games Enabled</span>
                        <Toggle
                            checked={form.open_games_enabled ?? false}
                            onChange={(v) => onChange("open_games_enabled", v)}
                        />
                    </div>

                    <div className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3">
                        <span className="text-sm text-foreground">Waitlist Enabled</span>
                        <Toggle
                            checked={form.waitlist_enabled ?? false}
                            onChange={(v) => onChange("waitlist_enabled", v)}
                        />
                    </div>
                </div>
            </section>
        </div>
    );
}
