import type { FormEvent, JSX } from "react";
import { useMemo, useState } from "react";
import { CalendarDays, Clock3, RefreshCw, UsersRound, X } from "lucide-react";
import {
    Breadcrumb,
    AlertToast,
    DatePicker,
    NumberInput,
    SelectInput,
    formatCurrency,
} from "@repo/ui";
import type { BookingType, TimeSlot } from "../../types";
import { BOOKING_TYPE_OPTIONS } from "../../types";
import { formatSlotTime } from "../../utils/slotTime";
import { PlayerAutocomplete } from "../../components/PlayerAutocomplete";
import { NewBookingModalView } from "./NewBookingModalView";

export type NewBookingMode = "page" | "modal";

const fieldCls =
    "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground " +
    "placeholder:text-muted-foreground transition focus:border-cta focus:outline-none focus:ring-2 focus:ring-cta-ring/30";

const labelCls = "mb-1 block text-sm font-medium text-foreground";

const sectionShellCls =
    "rounded-xl border border-border/80 bg-card/95 p-4 shadow-sm shadow-black/5 sm:p-5";

const sectionHeaderCls =
    "mb-4 flex items-start justify-between gap-3 border-b border-border/60 pb-3";

const sectionKickerCls = "text-[11px] font-semibold uppercase tracking-wide text-cta";

export type NewBookingFormState = {
    courtId: string;
    bookingType: BookingType;
    bookingDate: string;
    startTime: string;
    isOpenGame: boolean;
    maxPlayers: string;
    anchorSkill: string;
    skillMin: string;
    skillMax: string;
    eventName: string;
    contactName: string;
    contactEmail: string;
    contactPhone: string;
    playerUserIds: string[];
    staffProfileId: string;
};

type Trainer = { staff_profile_id: string; full_name: string };

type Props = {
    courts: { id: string; name: string }[];
    trainers: Trainer[];
    trainersLoading: boolean;
    trainersError: boolean;
    slots: TimeSlot[];
    slotsLoading: boolean;
    form: NewBookingFormState;
    courtError: string;
    startError: string;
    apiError: string;
    isPending: boolean;
    onFormChange: (patch: Partial<NewBookingFormState>) => void;
    onSubmit: (e: FormEvent) => void;
    onCancel: () => void;
    onDismissError: () => void;
    onRefreshSlots: () => void;
    selectedPrice: number | string | null;
    clubId?: string | null;
    mode?: NewBookingMode;
    courtName?: string;
    onClose?: () => void;
};

const typeOptions = BOOKING_TYPE_OPTIONS.filter((o) => o.value !== "");

export default function NewBookingView({
    courts,
    trainers,
    trainersLoading,
    trainersError,
    slots,
    slotsLoading,
    form,
    courtError,
    startError,
    apiError,
    isPending,
    onFormChange,
    onSubmit,
    onCancel,
    onDismissError,
    onRefreshSlots,
    selectedPrice,
    clubId,
    mode = "page",
    courtName,
    onClose,
}: Props): JSX.Element {
    const [invitePlayerId, setInvitePlayerId] = useState("");
    const [invitedPlayerNames, setInvitedPlayerNames] = useState<Record<string, string>>({});
    const courtSelected = Boolean(form.courtId);
    const invitedCount = form.playerUserIds.filter(Boolean).length;
    const todayStr = useMemo(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    }, []);
    const coreFields = (
        <>
            {apiError ? (
                <div className="mb-4">
                    <AlertToast title={apiError} variant="error" onClose={onDismissError} />
                </div>
            ) : null}

            {/* Row 1: Court | Booking Type */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {/* Court */}
                <div>
                    <label htmlFor="bk-court" className={labelCls}>
                        Court <span className="text-destructive">*</span>
                    </label>
                    <SelectInput
                        value={form.courtId}
                        onValueChange={(courtId) =>
                            onFormChange({ courtId, bookingDate: "", startTime: "" })
                        }
                        options={courts.map((c) => ({ value: c.id, label: c.name }))}
                        placeholder={courts.length === 0 ? "No courts available" : "Select court…"}
                        disabled={courts.length === 0}
                        className={courtError ? "!border-destructive" : ""}
                    />
                    {courtError ? (
                        <p className="mt-1 text-xs text-destructive">{courtError}</p>
                    ) : null}
                </div>

                {/* Booking type */}
                <div>
                    <label htmlFor="bk-type" className={labelCls}>
                        Booking Type
                    </label>
                    <SelectInput
                        value={form.bookingType}
                        onValueChange={(v) => onFormChange({ bookingType: v as BookingType })}
                        options={typeOptions}
                    />
                </div>
            </div>

            {/* Row 2: Date | Start Time */}
            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
                {/* Date */}
                <div>
                    <label htmlFor="bk-date" className={labelCls}>
                        Date <span className="text-destructive">*</span>
                    </label>
                    <DatePicker
                        value={form.bookingDate}
                        onChange={(v) => onFormChange({ bookingDate: v, startTime: "" })}
                        disabled={!courtSelected}
                        minDate={todayStr}
                        className={startError && !form.bookingDate ? "!border-destructive" : ""}
                    />
                </div>

                {/* Start time */}
                <div>
                    <div className="mb-1 flex items-center justify-between">
                        <label className="text-sm font-medium text-foreground">
                            Start Time <span className="text-destructive">*</span>
                        </label>
                        {courtSelected && form.bookingDate ? (
                            <button
                                type="button"
                                onClick={onRefreshSlots}
                                disabled={slotsLoading}
                                title="Refresh available slots"
                                className="text-muted-foreground transition hover:text-foreground disabled:opacity-40"
                            >
                                <RefreshCw
                                    size={13}
                                    className={slotsLoading ? "animate-spin" : ""}
                                />
                            </button>
                        ) : null}
                    </div>
                    {!courtSelected || !form.bookingDate ? (
                        <div className={`${fieldCls} cursor-not-allowed opacity-50`}>
                            <span className="text-muted-foreground">—</span>
                        </div>
                    ) : slotsLoading ? (
                        <div className={`${fieldCls} opacity-60`}>
                            <span className="text-muted-foreground">Loading…</span>
                        </div>
                    ) : slots.length === 0 ? (
                        <div className={`${fieldCls} opacity-60`}>
                            <span className="text-muted-foreground">No slots</span>
                        </div>
                    ) : (
                        <SelectInput
                            value={form.startTime}
                            onValueChange={(v) => onFormChange({ startTime: v })}
                            placeholder="Select time"
                            options={slots.map((slot) => ({
                                value: slot.start_time,
                                label:
                                    formatSlotTime(slot.start_time) +
                                    (!slot.is_available ? " — Booked" : ""),
                                disabled: !slot.is_available,
                            }))}
                            className={startError && !form.startTime ? "!border-destructive" : ""}
                        />
                    )}
                    {startError ? (
                        <p className="mt-1 text-xs text-destructive">{startError}</p>
                    ) : null}
                </div>
            </div>

            {/* Row 3: Max Players | Price */}
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:max-w-md">
                {/* Max players */}
                <div>
                    <label htmlFor="bk-max-players" className={labelCls}>
                        Max Players
                    </label>
                    <NumberInput
                        id="bk-max-players"
                        min={1}
                        max={10}
                        className={`${fieldCls} ${form.bookingType === "lesson_individual" ? "cursor-not-allowed opacity-80" : ""}`}
                        value={form.bookingType === "lesson_individual" ? "1" : form.maxPlayers}
                        readOnly={form.bookingType === "lesson_individual"}
                        onChange={(e) => onFormChange({ maxPlayers: e.target.value })}
                    />
                </div>

                {/* Price */}
                <div>
                    <label className={labelCls}>Price</label>
                    <div className={`${fieldCls} cursor-default select-none opacity-80`}>
                        {form.startTime ? formatCurrency(selectedPrice) : "—"}
                    </div>
                </div>
            </div>

            {/* Staff (Trainer) — lesson types only */}
            {form.bookingType === "lesson_individual" || form.bookingType === "lesson_group" ? (
                <div className="mt-4">
                    <label htmlFor="bk-staff-id" className={labelCls}>
                        Staff (Trainer)
                        <span className="ml-1 font-normal text-muted-foreground">
                            - Lesson assigned to the trainer.
                        </span>
                    </label>
                    {!form.startTime ? (
                        <div className={`${fieldCls} cursor-not-allowed opacity-50`}>
                            <span className="text-muted-foreground">Select a time slot first</span>
                        </div>
                    ) : trainersLoading ? (
                        <div className={`${fieldCls} opacity-60`}>
                            <span className="text-muted-foreground">Loading trainers…</span>
                        </div>
                    ) : trainersError ? (
                        <div className={`${fieldCls} opacity-60`}>
                            <span className="text-muted-foreground">Failed to load trainers</span>
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
                                trainers.length === 0 ? "No trainers available" : "Select trainer…"
                            }
                            disabled={trainers.length === 0}
                        />
                    )}
                </div>
            ) : null}

            {/* Add Players */}
            {!form.isOpenGame ? (
                <div className="mt-4 rounded-xl border border-border/70 bg-muted/10 p-4">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <p className={sectionKickerCls}>Participants</p>
                            <label
                                htmlFor="bk-invite-player"
                                className="mt-1 block text-sm font-semibold text-foreground"
                            >
                                Invited players
                            </label>
                            <p className="mt-1 text-xs text-muted-foreground">
                                Add confirmed players or leave seats open for later.
                            </p>
                        </div>
                        {invitedCount > 0 ? (
                            <div className="flex h-7 items-center gap-1.5 rounded-full bg-cta/10 px-2.5 text-xs font-semibold text-cta ring-1 ring-cta/20">
                                <UsersRound size={12} />
                                {invitedCount}
                            </div>
                        ) : null}
                    </div>
                    {invitedCount > 0 ? (
                        <div className="mb-3 flex flex-wrap gap-1.5">
                            {form.playerUserIds.map((uid, index) =>
                                uid ? (
                                    <span
                                        key={`${uid}-${index}`}
                                        className="inline-flex h-7 max-w-full items-center gap-1.5 rounded-full border border-border/70 bg-background/80 pl-2.5 pr-1.5 text-xs font-medium text-foreground"
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
                </div>
            ) : null}
        </>
    );

    const optionalEventFields = (
        <div className="space-y-4">
            <div>
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
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
        </div>
    );

    if (mode === "modal") {
        return (
            <NewBookingModalView
                courtName={courtName ?? form.courtId}
                trainers={trainers}
                trainersLoading={trainersLoading}
                trainersError={trainersError}
                form={form}
                apiError={apiError}
                isPending={isPending}
                selectedPrice={selectedPrice}
                clubId={clubId}
                onFormChange={onFormChange}
                onSubmit={onSubmit}
                onCancel={onCancel}
                onDismissError={onDismissError}
                onClose={onClose ?? onCancel}
            />
        );
    }

    return (
        <div className="w-full space-y-5">
            <Breadcrumb
                items={[{ label: "Bookings", href: "/bookings" }, { label: "New Booking" }]}
            />

            <section className="overflow-hidden rounded-xl border border-border bg-card shadow-lg shadow-black/5">
                <header className="relative overflow-hidden border-b border-border bg-muted/15 px-4 py-4 sm:px-6">
                    <div className="absolute inset-y-0 right-0 hidden w-1/3 bg-[radial-gradient(circle_at_top_right,rgba(20,184,166,0.14),transparent_42%)] sm:block" />
                    <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div className="max-w-2xl">
                            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-border bg-background/80 px-2.5 py-1 text-xs font-medium text-muted-foreground shadow-sm">
                                <CalendarDays size={13} className="text-cta" />
                                Court booking setup
                            </div>
                            <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                                New Booking
                            </h1>
                        </div>
                        <div className="grid w-full grid-cols-2 gap-2 sm:max-w-sm lg:w-auto lg:flex-none">
                            <div className="rounded-lg border border-border/70 bg-background/85 px-3 py-2.5 shadow-sm">
                                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                    Court
                                </p>
                                <p className="mt-1 truncate text-sm font-semibold text-foreground">
                                    {courts.find((court) => court.id === form.courtId)?.name ??
                                        "Not selected"}
                                </p>
                            </div>
                            <div className="rounded-lg border border-cta/20 bg-cta/5 px-3 py-2.5 shadow-sm">
                                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                    Total price
                                </p>
                                <p className="mt-1 text-sm font-semibold text-cta">
                                    {form.startTime ? formatCurrency(selectedPrice) : "Pending"}
                                </p>
                            </div>
                        </div>
                    </div>
                </header>

                <div className="bg-background/40 px-4 py-5 sm:px-6">
                    <form onSubmit={onSubmit} noValidate>
                        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(0,0.85fr)]">
                            {/* Core details */}
                            <section className={sectionShellCls}>
                                <div className={sectionHeaderCls}>
                                    <div>
                                        <p className={sectionKickerCls}>Details</p>
                                        <h3 className="mt-1 text-base font-semibold text-foreground">
                                            Core Details
                                        </h3>
                                        <p className="mt-1 text-sm text-muted-foreground">
                                            Select the court, booking type, time, and players.
                                        </p>
                                    </div>
                                    <Clock3 size={18} className="mt-1 text-muted-foreground" />
                                </div>
                                {coreFields}
                            </section>

                            <div className="space-y-5">
                                {/* Open Game — regular bookings only */}
                                {form.bookingType === "regular" ? (
                                    <section className={sectionShellCls}>
                                        <div className={sectionHeaderCls}>
                                            <div>
                                                <p className={sectionKickerCls}>Match quality</p>
                                                <h3 className="mt-1 text-base font-semibold text-foreground">
                                                    Open Game{" "}
                                                    <span className="text-xs font-normal text-muted-foreground">
                                                        (optional)
                                                    </span>
                                                </h3>
                                                <p className="mt-1 text-sm text-muted-foreground">
                                                    Mark as open to allow other players to join.
                                                </p>
                                            </div>
                                            <UsersRound
                                                size={18}
                                                className="mt-1 text-muted-foreground"
                                            />
                                        </div>
                                        <div className="rounded-lg border border-border/70 bg-muted/10 px-3 py-3">
                                            <label className="flex cursor-pointer items-center gap-2">
                                                <input
                                                    type="checkbox"
                                                    className="h-4 w-4 rounded border-border accent-cta"
                                                    checked={form.isOpenGame}
                                                    onChange={(e) =>
                                                        onFormChange({
                                                            isOpenGame: e.target.checked,
                                                        })
                                                    }
                                                    aria-label="Mark as open game"
                                                />
                                                <span className="text-sm font-medium text-foreground">
                                                    Open game
                                                </span>
                                            </label>
                                        </div>
                                    </section>
                                ) : null}

                                {/* Event / contact  */}
                                <section className={sectionShellCls}>
                                    <div className={sectionHeaderCls}>
                                        <div>
                                            <p className={sectionKickerCls}>Client details</p>
                                            <h3 className="mt-1 text-base font-semibold text-foreground">
                                                Event &amp; Contact{" "}
                                                <span className="text-xs font-normal text-muted-foreground">
                                                    (optional)
                                                </span>
                                            </h3>
                                            <p className="mt-1 text-sm text-muted-foreground">
                                                Useful for corporate, tournament, or hosted
                                                bookings.
                                            </p>
                                        </div>
                                    </div>
                                    {optionalEventFields}
                                </section>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="mt-6 flex items-center justify-end gap-2.5 border-t border-border/70 pt-5">
                            <button
                                type="button"
                                onClick={onCancel}
                                className="rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-semibold text-foreground shadow-sm transition hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-ring/30"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isPending}
                                className="rounded-lg bg-cta px-5 py-2.5 text-sm font-semibold text-cta-foreground shadow-sm transition hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-cta-ring/40 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {isPending ? "Creating…" : "Create Booking"}
                            </button>
                        </div>
                    </form>
                </div>
            </section>
        </div>
    );
}
