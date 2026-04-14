import type { FormEvent, JSX } from "react";
import { useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { AlertToast } from "@repo/ui";
import { useCreateBooking } from "../hooks";
import type { BookingInput, BookingType } from "../types";
import { BOOKING_TYPE_OPTIONS } from "../types";

const fieldCls =
    "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground " +
    "placeholder:text-muted-foreground transition focus:border-cta focus:outline-none focus:ring-2 focus:ring-cta-ring/30";

const labelCls = "mb-1 block text-sm font-medium text-foreground";

type Props = {
    clubId: string;
    courts: { id: string; name: string }[];
    onClose: () => void;
    onSuccess?: (message: string) => void;
};

function parseOptionalNumber(val: string): number | null {
    const n = parseFloat(val);
    return isNaN(n) ? null : n;
}

export default function CreateBookingModal({
    clubId,
    courts,
    onClose,
    onSuccess,
}: Props): JSX.Element {
    const [courtId, setCourtId] = useState(courts[0]?.id ?? "");
    const [bookingType, setBookingType] = useState<BookingType>("regular");
    const [startDatetime, setStartDatetime] = useState("");
    const [isOpenGame, setIsOpenGame] = useState(false);
    const [maxPlayers, setMaxPlayers] = useState("4");
    const [notes, setNotes] = useState("");
    const [anchorSkill, setAnchorSkill] = useState("");
    const [skillMin, setSkillMin] = useState("");
    const [skillMax, setSkillMax] = useState("");
    const [eventName, setEventName] = useState("");
    const [contactName, setContactName] = useState("");
    const [contactEmail, setContactEmail] = useState("");
    const [contactPhone, setContactPhone] = useState("");
    const [onBehalfOf, setOnBehalfOf] = useState("");

    const [courtError, setCourtError] = useState("");
    const [startError, setStartError] = useState("");

    const createMutation = useCreateBooking(clubId);
    const isPending = createMutation.isPending;
    const apiError = (createMutation.error as Error | null)?.message ?? "";

    const validate = (): boolean => {
        let valid = true;
        if (!courtId) {
            setCourtError("Court is required.");
            valid = false;
        } else {
            setCourtError("");
        }
        if (!startDatetime) {
            setStartError("Start date/time is required.");
            valid = false;
        } else {
            setStartError("");
        }
        return valid;
    };

    const handleSubmit = (e: FormEvent): void => {
        e.preventDefault();
        if (!validate()) return;

        const payload: BookingInput = {
            club_id: clubId,
            court_id: courtId,
            booking_type: bookingType,
            start_datetime: new Date(startDatetime).toISOString(),
            is_open_game: isOpenGame,
            max_players: parseOptionalNumber(maxPlayers) ?? undefined,
            notes: notes.trim() || null,
            anchor_skill_level: parseOptionalNumber(anchorSkill),
            skill_level_override_min: parseOptionalNumber(skillMin),
            skill_level_override_max: parseOptionalNumber(skillMax),
            event_name: eventName.trim() || null,
            contact_name: contactName.trim() || null,
            contact_email: contactEmail.trim() || null,
            contact_phone: contactPhone.trim() || null,
            on_behalf_of_user_id: onBehalfOf.trim() || null,
        };

        createMutation.mutate(payload, {
            onSuccess: () => {
                onClose();
                onSuccess?.("Booking created successfully.");
            },
        });
    };

    const typeOptions = BOOKING_TYPE_OPTIONS.filter((o) => o.value !== "");

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <div className="w-full max-w-lg rounded-xl border border-border bg-card shadow-xl">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-border px-6 py-4">
                    <h2 className="text-base font-semibold text-foreground">New Booking</h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                        aria-label="Close modal"
                    >
                        <X size={16} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} noValidate>
                    <div className="max-h-[70vh] space-y-4 overflow-y-auto px-6 py-5">
                        {apiError ? (
                            <AlertToast
                                title={apiError}
                                variant="error"
                                onClose={() => createMutation.reset()}
                            />
                        ) : null}

                        {/* Court */}
                        <div>
                            <label htmlFor="bk-court" className={labelCls}>
                                Court <span className="text-destructive">*</span>
                            </label>
                            <select
                                id="bk-court"
                                className={`${fieldCls} ${courtError ? "border-destructive" : ""}`}
                                value={courtId}
                                onChange={(e) => {
                                    setCourtId(e.target.value);
                                    if (courtError) setCourtError("");
                                }}
                            >
                                <option value="">Select a court</option>
                                {courts.map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.name}
                                    </option>
                                ))}
                            </select>
                            {courtError ? (
                                <p className="mt-1 text-xs text-destructive">{courtError}</p>
                            ) : null}
                        </div>

                        {/* Booking type */}
                        <div>
                            <label htmlFor="bk-type" className={labelCls}>
                                Booking Type
                            </label>
                            <select
                                id="bk-type"
                                className={fieldCls}
                                value={bookingType}
                                onChange={(e) => setBookingType(e.target.value as BookingType)}
                            >
                                {typeOptions.map((opt) => (
                                    <option key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Start datetime */}
                        <div>
                            <label htmlFor="bk-start" className={labelCls}>
                                Start <span className="text-destructive">*</span>
                            </label>
                            <input
                                id="bk-start"
                                type="datetime-local"
                                className={`${fieldCls} ${startError ? "border-destructive" : ""}`}
                                value={startDatetime}
                                onChange={(e) => {
                                    setStartDatetime(e.target.value);
                                    if (startError) setStartError("");
                                }}
                            />
                            {startError ? (
                                <p className="mt-1 text-xs text-destructive">{startError}</p>
                            ) : null}
                        </div>

                        {/* Open game + max players */}
                        <div className="flex items-start gap-4">
                            <label className="flex cursor-pointer items-center gap-2 pt-1">
                                <input
                                    type="checkbox"
                                    className="h-4 w-4 rounded border-border accent-cta"
                                    checked={isOpenGame}
                                    onChange={(e) => setIsOpenGame(e.target.checked)}
                                    aria-label="Mark as open game"
                                />
                                <span className="text-sm font-medium text-foreground">
                                    Open game
                                </span>
                            </label>
                            <div className="flex-1">
                                <label htmlFor="bk-max-players" className={labelCls}>
                                    Max players
                                </label>
                                <input
                                    id="bk-max-players"
                                    type="number"
                                    min="1"
                                    max="10"
                                    className={fieldCls}
                                    value={maxPlayers}
                                    onChange={(e) => setMaxPlayers(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Skill level */}
                        <div className="rounded-lg border border-border bg-muted/20 px-4 py-3">
                            <p className="mb-3 text-sm font-semibold text-foreground">
                                Skill Level
                                <span className="ml-1 text-xs font-normal text-muted-foreground">
                                    (optional)
                                </span>
                            </p>
                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label htmlFor="bk-anchor-skill" className={labelCls}>
                                        Anchor
                                    </label>
                                    <input
                                        id="bk-anchor-skill"
                                        type="number"
                                        min="0"
                                        step="0.1"
                                        className={fieldCls}
                                        placeholder="3.5"
                                        value={anchorSkill}
                                        onChange={(e) => setAnchorSkill(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label htmlFor="bk-skill-min" className={labelCls}>
                                        Min
                                    </label>
                                    <input
                                        id="bk-skill-min"
                                        type="number"
                                        min="0"
                                        step="0.1"
                                        className={fieldCls}
                                        placeholder="2.5"
                                        value={skillMin}
                                        onChange={(e) => setSkillMin(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label htmlFor="bk-skill-max" className={labelCls}>
                                        Max
                                    </label>
                                    <input
                                        id="bk-skill-max"
                                        type="number"
                                        min="0"
                                        step="0.1"
                                        className={fieldCls}
                                        placeholder="4.5"
                                        value={skillMax}
                                        onChange={(e) => setSkillMax(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Event / contact (corporate / tournament) */}
                        <div>
                            <label htmlFor="bk-event-name" className={labelCls}>
                                Event name
                                <span className="ml-1 text-xs font-normal text-muted-foreground">
                                    (optional)
                                </span>
                            </label>
                            <input
                                id="bk-event-name"
                                type="text"
                                className={fieldCls}
                                placeholder="e.g. Friday Corporate Cup"
                                value={eventName}
                                onChange={(e) => setEventName(e.target.value)}
                            />
                        </div>

                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                            <div>
                                <label htmlFor="bk-contact-name" className={labelCls}>
                                    Contact name
                                </label>
                                <input
                                    id="bk-contact-name"
                                    type="text"
                                    className={fieldCls}
                                    value={contactName}
                                    onChange={(e) => setContactName(e.target.value)}
                                />
                            </div>
                            <div>
                                <label htmlFor="bk-contact-email" className={labelCls}>
                                    Contact email
                                </label>
                                <input
                                    id="bk-contact-email"
                                    type="email"
                                    className={fieldCls}
                                    value={contactEmail}
                                    onChange={(e) => setContactEmail(e.target.value)}
                                />
                            </div>
                            <div>
                                <label htmlFor="bk-contact-phone" className={labelCls}>
                                    Contact phone
                                </label>
                                <input
                                    id="bk-contact-phone"
                                    type="tel"
                                    className={fieldCls}
                                    value={contactPhone}
                                    onChange={(e) => setContactPhone(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* On behalf of player */}
                        <div>
                            <label htmlFor="bk-on-behalf" className={labelCls}>
                                On behalf of (user ID)
                                <span className="ml-1 text-xs font-normal text-muted-foreground">
                                    (optional — designates a player as organiser)
                                </span>
                            </label>
                            <input
                                id="bk-on-behalf"
                                type="text"
                                className={fieldCls}
                                placeholder="Player user ID"
                                value={onBehalfOf}
                                onChange={(e) => setOnBehalfOf(e.target.value)}
                            />
                        </div>

                        {/* Notes */}
                        <div>
                            <label htmlFor="bk-notes" className={labelCls}>
                                Notes
                                <span className="ml-1 text-xs font-normal text-muted-foreground">
                                    (optional)
                                </span>
                            </label>
                            <textarea
                                id="bk-notes"
                                rows={3}
                                className={fieldCls}
                                placeholder="Internal notes visible to staff only…"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-end gap-3 border-t border-border px-6 py-4">
                        <button type="button" onClick={onClose} className="btn-outline">
                            Cancel
                        </button>
                        <button type="submit" disabled={isPending} className="btn-cta">
                            {isPending ? "Creating…" : "Create Booking"}
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
}
