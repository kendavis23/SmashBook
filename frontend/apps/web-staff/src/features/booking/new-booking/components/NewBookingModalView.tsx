import type { FormEvent, JSX } from "react";
import { useState } from "react";
import { CalendarDays, UsersRound, X } from "lucide-react";
import { AlertToast, NumberInput, RecurrencePicker, SelectInput, formatCurrency } from "@repo/ui";
import type { BookingType } from "../../types";
import { BOOKING_TYPE_OPTIONS } from "../../types";
import { formatSlotTime } from "../../utils/slotTime";
import type { NewBookingFormState } from "./NewBookingView";
import { PlayerAutocomplete } from "../../components/PlayerAutocomplete";
import {
    canEditMaxPlayers,
    createOpenGameSettingsPatch,
    DEFAULT_RECURRENCE_RULE,
    getMaxPlayersLimit,
    INDIVIDUAL_LESSON_MAX_PLAYERS_TITLE,
    isLessonBookingType,
    OPEN_GAME_SKILL_DEFAULTS,
    resolveMaxPlayers,
    shouldShowInvitedPlayers,
    shouldShowOpenGameSettings,
    shouldShowOnBehalfField,
    shouldShowRecurringSettings,
} from "./newBookingRules";

const fieldCls =
    "w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground " +
    "placeholder:text-muted-foreground transition focus:border-cta focus:outline-none focus:ring-2 focus:ring-cta-ring/30";

const labelCls = "mb-1 block text-xs font-medium text-foreground";

const dividerCls = "border-t-2 border-border/20 pt-3";
const sectionCls = `space-y-2 ${dividerCls}`;

const typeOptions = BOOKING_TYPE_OPTIONS.filter((o) => o.value !== "");

function DetailItem({ label, value }: { label: string; value: string }): JSX.Element {
    return (
        <li className="min-w-0 bg-muted/15 px-3 py-2">
            <span className="block text-[10px] font-semibold uppercase text-muted-foreground">
                {label}
            </span>
            <span className="mt-0.5 block truncate text-sm font-semibold text-foreground">
                {value}
            </span>
        </li>
    );
}

type Trainer = { staff_profile_id: string; full_name: string };

type Props = {
    courtName: string;
    trainers: Trainer[];
    trainersLoading: boolean;
    trainersError: boolean;
    form: NewBookingFormState;
    apiError: string;
    onBehalfOfError: string;
    staffProfileError: string;
    isPending: boolean;
    selectedPrice: number | string | null;
    clubId?: string | null;
    onFormChange: (patch: Partial<NewBookingFormState>) => void;
    onSubmit: (e: FormEvent) => void;
    onCancel: () => void;
    onDismissError: () => void;
    onClose: () => void;
};

export function NewBookingModalView({
    courtName,
    trainers,
    trainersLoading,
    trainersError,
    form,
    apiError,
    onBehalfOfError,
    staffProfileError,
    isPending,
    selectedPrice,
    clubId,
    onFormChange,
    onSubmit,
    onCancel,
    onDismissError,
    onClose,
}: Props): JSX.Element {
    const [invitePlayerId, setInvitePlayerId] = useState("");
    const [invitedPlayerNames, setInvitedPlayerNames] = useState<Record<string, string>>({});
    const isLessonType = isLessonBookingType(form.bookingType);
    const canChangeMaxPlayers = canEditMaxPlayers(form.bookingType);
    const showOnBehalfField = shouldShowOnBehalfField(form.isOpenGame);
    const showInvitedPlayers = shouldShowInvitedPlayers(form.isOpenGame);
    const showOpenGameSettings = shouldShowOpenGameSettings(form.bookingType);
    const showRecurringSettings = shouldShowRecurringSettings(form.bookingType);
    const invitedCount = form.playerUserIds.filter(Boolean).length;

    const formattedDate = form.bookingDate
        ? new Date(form.bookingDate + "T00:00:00").toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
              year: "numeric",
          })
        : "—";

    const formattedTime = form.startTime ? formatSlotTime(form.startTime) : "—";
    const formattedPrice = form.startTime ? (formatCurrency(selectedPrice) ?? "—") : "—";

    return (
        <form onSubmit={onSubmit} noValidate className="flex h-full flex-col overflow-hidden rounded-xl bg-card">
            <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-5 py-2.5">
                <div className="min-w-0">
                    <h2 className="text-base font-semibold tracking-tight text-foreground">
                        New Booking
                    </h2>
                </div>
                <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close modal"
                    className="shrink-0 rounded-md p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                >
                    <X size={16} />
                </button>
            </header>

            <main className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-3">
                {apiError ? (
                    <AlertToast title={apiError} variant="error" onClose={onDismissError} />
                ) : null}

                <ul className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border/70 bg-border/70 sm:grid-cols-4">
                    <DetailItem label="Court" value={courtName} />
                    <DetailItem label="Date" value={formattedDate} />
                    <DetailItem label="Start Time" value={formattedTime} />
                    <DetailItem label="Price" value={formattedPrice} />
                </ul>

                <section className={`grid grid-cols-1 gap-3 sm:grid-cols-2 ${dividerCls}`}>
                    <div>
                        <label className={labelCls}>
                            Booking Type <span className="text-destructive">*</span>
                        </label>
                        <SelectInput
                            value={form.bookingType}
                            onValueChange={(v) => onFormChange({ bookingType: v as BookingType })}
                            options={typeOptions}
                        />
                    </div>
                    <div>
                        <label htmlFor="bk-max-players" className={labelCls}>
                            Max Players <span className="text-destructive">*</span>
                        </label>
                        <NumberInput
                            id="bk-max-players"
                            min={1}
                            max={getMaxPlayersLimit(form.bookingType)}
                            className={`${fieldCls} ${!canChangeMaxPlayers ? "cursor-not-allowed opacity-70" : ""}`}
                            value={resolveMaxPlayers(form.bookingType, form.maxPlayers)}
                            disabled={!canChangeMaxPlayers}
                            title={
                                !canChangeMaxPlayers
                                    ? INDIVIDUAL_LESSON_MAX_PLAYERS_TITLE
                                    : undefined
                            }
                            onChange={(e) => {
                                if (canChangeMaxPlayers) {
                                    onFormChange({ maxPlayers: e.target.value });
                                }
                            }}
                        />
                    </div>

                    {showOnBehalfField ? (
                        <div>
                            <label htmlFor="bk-on-behalf" className={labelCls}>
                                On behalf of <span className="text-destructive">*</span>
                            </label>
                            <PlayerAutocomplete
                                label="On behalf of"
                                inputId="bk-on-behalf"
                                clubId={clubId}
                                value={form.onBehalfOf}
                                onChange={(playerId) => onFormChange({ onBehalfOf: playerId })}
                                error={Boolean(onBehalfOfError)}
                            />
                            {onBehalfOfError ? (
                                <p className="mt-1 text-xs text-destructive">{onBehalfOfError}</p>
                            ) : null}
                        </div>
                    ) : null}

                    {isLessonType ? (
                        <div>
                            <label htmlFor="bk-staff-id" className={labelCls}>
                                Staff (Trainer) <span className="text-destructive">*</span>
                            </label>
                            {trainersLoading ? (
                                <div className={`${fieldCls} opacity-60`}>
                                    <span className="text-muted-foreground">
                                        Loading trainers...
                                    </span>
                                </div>
                            ) : trainersError ? (
                                <div className={`${fieldCls} opacity-60`}>
                                    <span className="text-muted-foreground">
                                        Failed to load trainers
                                    </span>
                                </div>
                            ) : (
                                <SelectInput
                                    value={form.staffProfileId}
                                    onValueChange={(v) => onFormChange({ staffProfileId: v })}
                                    options={trainers.map((t) => ({
                                        value: t.staff_profile_id,
                                        label: t.full_name,
                                    }))}
                                    placeholder={
                                        trainers.length === 0
                                            ? "No trainers available"
                                            : "Select trainer..."
                                    }
                                    disabled={trainers.length === 0}
                                    className={staffProfileError ? "!border-destructive" : ""}
                                />
                            )}
                            {staffProfileError ? (
                                <p className="mt-1 text-xs text-destructive">{staffProfileError}</p>
                            ) : null}
                        </div>
                    ) : null}
                </section>

                {showInvitedPlayers ? (
                    <section className={sectionCls}>
                        <div className="flex items-center justify-between gap-2">
                            <label htmlFor="bk-invite-player" className={labelCls}>
                                Invited players
                            </label>
                            {invitedCount > 0 ? (
                                <span className="inline-flex h-6 items-center gap-1.5 rounded-full bg-cta/10 px-2.5 text-[11px] font-semibold text-cta ring-1 ring-cta/20">
                                    <UsersRound size={11} />
                                    {invitedCount}
                                </span>
                            ) : null}
                        </div>
                        {invitedCount > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
                                {form.playerUserIds.map((uid, index) =>
                                    uid ? (
                                        <span
                                            key={`${uid}-${index}`}
                                            className="inline-flex h-7 max-w-[180px] items-center gap-1.5 rounded-full border border-border/70 bg-muted/30 pl-2.5 pr-1.5 text-xs font-medium text-foreground"
                                        >
                                            <span className="truncate">
                                                {invitedPlayerNames[uid] ?? `Player ${index + 1}`}
                                            </span>
                                            <button
                                                type="button"
                                                aria-label={`Remove ${invitedPlayerNames[uid] ?? `player ${index + 1}`}`}
                                                onClick={() => {
                                                    const next = form.playerUserIds.filter(
                                                        (_, i) => i !== index
                                                    );
                                                    onFormChange({ playerUserIds: next });
                                                }}
                                                className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
                                            >
                                                <X size={10} />
                                            </button>
                                        </span>
                                    ) : null
                                )}
                            </div>
                        ) : null}
                        <PlayerAutocomplete
                            label="Invite player"
                            inputId="bk-invite-player"
                            clubId={clubId}
                            value={invitePlayerId}
                            placeholder="Search and add player..."
                            onChange={setInvitePlayerId}
                            onSelect={(player) => {
                                setInvitedPlayerNames((names) => ({
                                    ...names,
                                    [player.id]: player.full_name,
                                }));
                                if (!form.playerUserIds.includes(player.id)) {
                                    onFormChange({
                                        playerUserIds: [
                                            ...form.playerUserIds.filter(Boolean),
                                            player.id,
                                        ],
                                    });
                                }
                                setInvitePlayerId("");
                            }}
                        />
                    </section>
                ) : null}

                {showOpenGameSettings ? (
                    <section className={sectionCls}>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4 sm:items-end">
                            <div>
                                <label htmlFor="bk-is-open-game" className={labelCls}>
                                    Game settings
                                </label>
                                <label className="flex h-[34px] w-full cursor-pointer items-center gap-2 rounded-lg border border-border bg-background px-3 text-sm text-foreground transition hover:bg-muted/20">
                                    <input
                                        id="bk-is-open-game"
                                        type="checkbox"
                                        className="h-4 w-4 rounded border-border accent-cta"
                                        checked={form.isOpenGame}
                                        onChange={(e) =>
                                            onFormChange(
                                                createOpenGameSettingsPatch(e.target.checked)
                                            )
                                        }
                                        aria-label="Mark as open game"
                                    />
                                    <span className="whitespace-nowrap text-sm font-medium text-foreground">
                                        Open game
                                    </span>
                                </label>
                            </div>
                            <div>
                                <label htmlFor="bk-anchor-skill" className={labelCls}>
                                    Anchor
                                </label>
                                <NumberInput
                                    id="bk-anchor-skill"
                                    min={0}
                                    step={0.1}
                                    className={fieldCls}
                                    placeholder={OPEN_GAME_SKILL_DEFAULTS.anchorSkill}
                                    value={form.anchorSkill}
                                    onChange={(e) => onFormChange({ anchorSkill: e.target.value })}
                                />
                            </div>
                            <div>
                                <label htmlFor="bk-skill-min" className={labelCls}>
                                    Skill min
                                </label>
                                <NumberInput
                                    id="bk-skill-min"
                                    min={0}
                                    step={0.1}
                                    className={fieldCls}
                                    placeholder={OPEN_GAME_SKILL_DEFAULTS.skillMin}
                                    value={form.skillMin}
                                    onChange={(e) => onFormChange({ skillMin: e.target.value })}
                                />
                            </div>
                            <div>
                                <label htmlFor="bk-skill-max" className={labelCls}>
                                    Skill max
                                </label>
                                <NumberInput
                                    id="bk-skill-max"
                                    min={0}
                                    step={0.1}
                                    className={fieldCls}
                                    placeholder={OPEN_GAME_SKILL_DEFAULTS.skillMax}
                                    value={form.skillMax}
                                    onChange={(e) => onFormChange({ skillMax: e.target.value })}
                                />
                            </div>
                        </div>
                    </section>
                ) : null}

                <section className={`space-y-3 ${dividerCls}`}>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div className="sm:col-span-2">
                            <label htmlFor="bk-event-name" className={labelCls}>
                                Event name
                            </label>
                            <input
                                id="bk-event-name"
                                type="text"
                                className={fieldCls}
                                placeholder="e.g. Friday Corporate Cup"
                                value={form.eventName}
                                onChange={(e) => onFormChange({ eventName: e.target.value })}
                            />
                        </div>
                        <div>
                            <label htmlFor="bk-contact-name" className={labelCls}>
                                Contact name
                            </label>
                            <input
                                id="bk-contact-name"
                                type="text"
                                className={fieldCls}
                                value={form.contactName}
                                onChange={(e) => onFormChange({ contactName: e.target.value })}
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
                                value={form.contactEmail}
                                onChange={(e) => onFormChange({ contactEmail: e.target.value })}
                            />
                        </div>
                    </div>
                    <div>
                        <label htmlFor="bk-contact-phone" className={labelCls}>
                            Contact phone
                        </label>
                        <input
                            id="bk-contact-phone"
                            type="tel"
                            className={fieldCls}
                            value={form.contactPhone}
                            onChange={(e) => onFormChange({ contactPhone: e.target.value })}
                        />
                    </div>
                </section>

                {showRecurringSettings ? (
                    <section className={sectionCls}>
                        <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-border/70 bg-muted/20 px-3 py-2">
                            <input
                                id="bk-modal-recurring"
                                type="checkbox"
                                className="h-4 w-4 rounded border-border accent-cta"
                                checked={form.isRecurring}
                                onChange={(e) =>
                                    onFormChange({
                                        isRecurring: e.target.checked,
                                        recurrenceRule:
                                            e.target.checked && !form.recurrenceRule.trim()
                                                ? DEFAULT_RECURRENCE_RULE
                                                : form.recurrenceRule,
                                    })
                                }
                            />
                            <span className="text-sm font-medium text-foreground">
                                Repeat this booking
                            </span>
                        </label>
                        {form.isRecurring ? (
                            <>
                                <RecurrencePicker
                                    value={form.recurrenceRule}
                                    onChange={(rule) => onFormChange({ recurrenceRule: rule })}
                                />
                                <label className="flex cursor-pointer items-center gap-2">
                                    <input
                                        type="checkbox"
                                        className="h-4 w-4 rounded border-border accent-cta"
                                        checked={form.skipConflicts}
                                        onChange={(e) =>
                                            onFormChange({ skipConflicts: e.target.checked })
                                        }
                                        aria-label="Skip conflicting slots"
                                    />
                                    <span className="text-sm text-foreground">
                                        Skip conflicting slots
                                    </span>
                                </label>
                            </>
                        ) : null}
                    </section>
                ) : null}

                <section className={sectionCls}>
                    <label htmlFor="bk-notes" className={labelCls}>
                        Notes <span className="font-normal text-muted-foreground">(optional)</span>
                    </label>
                    <textarea
                        id="bk-notes"
                        rows={2}
                        className={fieldCls}
                        placeholder="Internal notes visible to staff only..."
                        value={form.notes}
                        onChange={(e) => onFormChange({ notes: e.target.value })}
                    />
                </section>
            </main>

            <footer className="flex shrink-0 items-center justify-end gap-3 border-t border-border px-5 py-2.5">
                <button type="button" onClick={onCancel} className="btn-outline">
                    Cancel
                </button>
                <button
                    type="submit"
                    disabled={isPending}
                    className="btn-cta flex items-center gap-2"
                >
                    <CalendarDays size={14} />
                    {isPending ? "Creating..." : "Create Booking"}
                </button>
            </footer>
        </form>
    );
}
