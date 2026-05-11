import type { FormEvent, JSX } from "react";
import { useState } from "react";
import { CalendarDays, Clock, MapPin, Users, X } from "lucide-react";
import { AlertToast, NumberInput, SelectInput, formatCurrency, formatUTCDate } from "@repo/ui";
import type { BookingType } from "../../types";
import { BOOKING_TYPE_OPTIONS } from "../../types";
import { formatSlotTime } from "../../utils/slotTime";
import { PlayerAutocomplete } from "../../components/PlayerAutocomplete";
import type { NewBookingFormState } from "./NewBookingView";
import { buildTrainerOptions } from "./trainerSelect";
import type { TrainerOptionSource } from "./trainerSelect";

const fieldCls =
    "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground " +
    "placeholder:text-muted-foreground transition focus:border-cta focus:outline-none focus:ring-2 focus:ring-cta-ring/30";

const labelCls = "mb-1 block text-xs font-medium text-foreground";

const typeOptions = BOOKING_TYPE_OPTIONS.filter(
    (o) => o.value === "regular" || o.value === "lesson_individual"
);

function MatchInfoCard({
    icon,
    label,
    value,
}: {
    icon: JSX.Element;
    label: string;
    value: string;
}): JSX.Element {
    return (
        <div className={`flex flex-col gap-1.5 rounded-xl p-3 border border-border/60 bg-muted/15`}>
            <div className={`flex items-center gap-1.5 text-muted-foreground`}>
                {icon}
                <span className="text-[10px] font-semibold uppercase tracking-wider">{label}</span>
            </div>
            <span className={`text-sm font-semibold leading-tight text-foreground`}>{value}</span>
        </div>
    );
}

type Trainer = TrainerOptionSource;

type Props = {
    courtName: string;
    trainers: Trainer[];
    trainersLoading: boolean;
    trainersError: boolean;
    form: NewBookingFormState;
    staffError: string;
    apiError: string;
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
    staffError,
    apiError,
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
    const isIndividualLesson = form.bookingType === "lesson_individual";
    const isLessonType =
        form.bookingType === "lesson_individual" || form.bookingType === "lesson_group";
    const invitedCount = form.playerUserIds.filter(Boolean).length;
    const trainerOptions = buildTrainerOptions(trainers);

    const formattedDate = form.bookingDate ? formatUTCDate(form.bookingDate + "T00:00:00Z") : "—";
    const formattedTime = form.startTime ? formatSlotTime(form.startTime) : "—";
    const formattedPrice = form.startTime ? (formatCurrency(selectedPrice) ?? "—") : "—";

    return (
        <form
            onSubmit={onSubmit}
            noValidate
            className="flex h-full flex-col overflow-hidden rounded-xl bg-card"
        >
            {/* Header */}
            <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-5 py-3">
                <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cta/10">
                        <CalendarDays size={15} className="text-cta" />
                    </div>
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

            <main className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
                {apiError ? (
                    <AlertToast title={apiError} variant="error" onClose={onDismissError} />
                ) : null}

                {/* Match Information */}
                <div className="space-y-2">
                    <p className={labelCls}>Match Information</p>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        <MatchInfoCard
                            icon={<MapPin size={11} />}
                            label="Court"
                            value={courtName}
                        />
                        <MatchInfoCard
                            icon={<CalendarDays size={11} />}
                            label="Date"
                            value={formattedDate}
                        />
                        <MatchInfoCard
                            icon={<Clock size={11} />}
                            label="Time"
                            value={formattedTime}
                        />
                        <MatchInfoCard
                            icon={<span className="text-[11px] font-bold">£</span>}
                            label="Price"
                            value={formattedPrice}
                        />
                    </div>
                </div>

                {/* Booking Settings */}
                <div className="space-y-2 border-t border-border/30 pt-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className={labelCls}>
                                Booking Type <span className="text-destructive normal-case">*</span>
                            </label>
                            <SelectInput
                                value={form.bookingType}
                                onValueChange={(v) =>
                                    onFormChange({
                                        bookingType: v as BookingType,
                                        maxPlayers: v === "lesson_individual" ? "1" : "4",
                                    })
                                }
                                options={typeOptions}
                            />
                        </div>
                        <div>
                            <label htmlFor="bk-max-players" className={labelCls}>
                                Max Players <span className="text-destructive normal-case">*</span>
                            </label>
                            <NumberInput
                                id="bk-max-players"
                                min={1}
                                max={10}
                                className={`${fieldCls} ${form.bookingType === "lesson_individual" ? "cursor-not-allowed opacity-80" : ""}`}
                                value={
                                    form.bookingType === "lesson_individual" ? "1" : form.maxPlayers
                                }
                                readOnly={form.bookingType === "lesson_individual"}
                                onChange={(e) => onFormChange({ maxPlayers: e.target.value })}
                            />
                        </div>
                    </div>
                </div>

                {isLessonType ? (
                    <div className="space-y-3 border-t border-border/30 pt-4">
                        <label htmlFor="bk-staff-id" className={labelCls}>
                            Staff (Trainer)
                            {isIndividualLesson ? (
                                <span className="ml-1 text-destructive normal-case">*</span>
                            ) : null}
                        </label>
                        {trainersLoading ? (
                            <div className={`${fieldCls} opacity-60`}>
                                <span className="text-muted-foreground">Loading trainers…</span>
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
                                options={trainerOptions}
                                placeholder={
                                    trainerOptions.length === 0
                                        ? "Trainer not available"
                                        : "Select trainer..."
                                }
                                disabled={!isIndividualLesson && trainerOptions.length === 0}
                                className={staffError ? "!border-destructive" : ""}
                            />
                        )}
                        {staffError ? (
                            <p className="mt-1 text-xs text-destructive">{staffError}</p>
                        ) : null}
                    </div>
                ) : null}

                {!isIndividualLesson ? (
                    <div className="space-y-3 border-t border-border/30 pt-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className={labelCls}>Invite Players</p>
                            </div>
                            {invitedCount > 0 ? (
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-cta/10 px-2.5 py-1 text-xs font-semibold text-cta ring-1 ring-cta/20">
                                    <Users size={11} />
                                    {invitedCount} added
                                </span>
                            ) : null}
                        </div>

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

                        {invitedCount > 0 ? (
                            <div className="mt-2 grid grid-cols-2 gap-2">
                                {form.playerUserIds.filter(Boolean).map((uid, index) => (
                                    <div
                                        key={`${uid}-${index}`}
                                        className="flex items-center justify-between gap-2 rounded-xl border border-border/60 bg-muted/20 px-3 py-2.5"
                                    >
                                        <div className="min-w-0">
                                            <p className="truncate text-sm text-foreground">
                                                {invitedPlayerNames[uid] ?? `Player ${index + 1}`}
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            aria-label={`Remove ${invitedPlayerNames[uid] ?? `player ${index + 1}`}`}
                                            onClick={() => {
                                                const next = form.playerUserIds.filter(
                                                    (_, i) => i !== index
                                                );
                                                onFormChange({ playerUserIds: next });
                                            }}
                                            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
                                        >
                                            <X size={12} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : null}
                    </div>
                ) : null}
            </main>

            <footer className="flex shrink-0 items-center justify-end gap-3 border-t border-border px-5 py-3">
                <button type="button" onClick={onCancel} className="btn-outline">
                    Cancel
                </button>
                <button
                    type="submit"
                    disabled={isPending}
                    className="btn-cta flex items-center gap-2"
                >
                    <CalendarDays size={14} />
                    {isPending ? "Creating..." : "Create & Pay"}
                </button>
            </footer>
        </form>
    );
}
