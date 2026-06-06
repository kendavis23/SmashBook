import {
    AlertToast,
    Breadcrumb,
    DatePicker,
    SelectInput,
    TimeInput,
    formatCurrency,
    formatPlainTime,
} from "@repo/ui";
import type { SelectOption } from "@repo/ui";
import {
    CalendarDays,
    ChevronDown,
    ChevronUp,
    Clock,
    Loader2,
    MapPin,
    RefreshCw,
    ShieldCheck,
    Users,
    X,
} from "lucide-react";
import React, { type JSX } from "react";

import type { ClubAvailability, ClubAvailabilityCourt, ClubAvailabilitySlot } from "../../types";
import { SURFACE_OPTIONS } from "../../types";

type Props = {
    date: string;
    surface: string;
    fromTime: string;
    toTime: string;
    availability: ClubAvailability | undefined;
    isLoading: boolean;
    error: Error | null;
    selectedSlot: ClubAvailabilitySlot | null;
    isJoining: boolean;
    joiningBookingId: string;
    joinError: string;
    successMessage: string;
    warningMessage: string;
    onDateChange: (v: string) => void;
    onSurfaceChange: (v: string) => void;
    onFromTimeChange: (v: string) => void;
    onFromTimeCommit: (v: string) => void;
    onToTimeChange: (v: string) => void;
    onToTimeCommit: (v: string) => void;
    onSelectSlot: (slot: ClubAvailabilitySlot) => void;
    onBook: (courtId: string, slot: ClubAvailabilitySlot) => void;
    onJoin: (bookingId: string) => void;
    onRefresh: () => void;
    onClear: () => void;
    onDismissJoinError: () => void;
    onDismissSuccess: () => void;
    onDismissWarning: () => void;
};

function CourtCard({
    court,
    slot,
    isJoining,
    joiningBookingId,
    onBook,
    onJoin,
}: {
    court: ClubAvailabilityCourt;
    slot: ClubAvailabilitySlot;
    isJoining: boolean;
    joiningBookingId: string;
    onBook: (courtId: string) => void;
    onJoin: (bookingId: string) => void;
}): JSX.Element {
    const slotCourt = slot.available_courts.find((c) => c.court_id === court.id);
    const existingMatch = slot.existing_matches.find((m) => m.court_id === court.id);
    const isAvailableToBook = slotCourt !== undefined;
    const isJoinable = existingMatch !== undefined && existingMatch.slots_available > 0;
    const price = slotCourt?.price ?? existingMatch?.total_price ?? null;

    const surfaceLabel = court.surface_type
        .replace(/_/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());

    const cardBorderClass = isAvailableToBook
        ? "border-cta/30 hover:border-cta/45"
        : isJoinable
          ? "border-success/35 hover:border-success/50"
          : "border-border hover:border-border/80";

    return (
        <div
            className={`group relative flex items-stretch gap-0 overflow-hidden rounded-2xl border bg-card transition-all duration-200 hover:shadow-md ${cardBorderClass}`}
        >
            <div className="flex min-w-0 flex-1 flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                {/* Court info */}
                <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[15px] font-semibold tracking-tight text-foreground">
                            {court.name}
                        </span>
                        {isJoinable && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2.5 py-0.5 text-[11px] font-semibold text-success ring-1 ring-success/20">
                                <span className="h-1.5 w-1.5 rounded-full bg-success" />
                                Open game
                            </span>
                        )}
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                            <MapPin size={11} className="shrink-0" />
                            {surfaceLabel}
                        </span>
                        {court.has_lighting && (
                            <span className="flex items-center gap-1.5">
                                <ShieldCheck size={11} className="shrink-0" />
                                Lighting
                            </span>
                        )}
                        {isJoinable && existingMatch && (
                            <span className="font-medium text-success">
                                {existingMatch.slots_available} spot
                                {existingMatch.slots_available !== 1 ? "s" : ""} left
                            </span>
                        )}
                    </div>

                    {court.has_lighting && court.lighting_surcharge !== null && (
                        <div className="text-[11px] text-muted-foreground/70">
                            + {formatCurrency(court.lighting_surcharge)} lighting surcharge
                        </div>
                    )}
                </div>

                {/* Price + action */}
                <div className="flex shrink-0 flex-col items-start gap-3 sm:items-end">
                    {price !== null && (
                        <div className="text-left sm:text-right">
                            <div className="text-xl font-bold tracking-tight text-foreground">
                                {formatCurrency(price)}
                            </div>
                            <div className="text-[10px] uppercase tracking-wider text-muted-foreground/60">
                                per court
                            </div>
                        </div>
                    )}

                    {isAvailableToBook && (
                        <button
                            onClick={() => onBook(court.id)}
                            className="btn-cta min-h-9 w-full rounded-xl px-5 text-xs font-semibold tracking-wide shadow-sm transition-all hover:shadow-md sm:w-auto"
                        >
                            Book Now
                        </button>
                    )}
                    {!isAvailableToBook && isJoinable && existingMatch && (
                        <button
                            onClick={() => onJoin(existingMatch.booking_id)}
                            disabled={isJoining}
                            className="inline-flex min-h-9 w-full items-center justify-center gap-1.5 rounded-xl bg-success px-5 text-xs font-semibold text-success-foreground shadow-sm ring-1 ring-success/20 transition-all hover:bg-success/90 hover:shadow-md disabled:opacity-60 sm:w-auto"
                        >
                            {joiningBookingId === existingMatch.booking_id ? (
                                <Loader2 size={13} className="animate-spin" />
                            ) : (
                                <Users size={13} />
                            )}
                            Join Game
                        </button>
                    )}
                    {!isAvailableToBook && !isJoinable && (
                        <div className="rounded-xl bg-muted/60 px-4 py-2 text-center ring-1 ring-border/50">
                            <div className="text-xs font-semibold text-muted-foreground">
                                Unavailable
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function SlotRow({
    slot,
    isSelected,
    onClick,
}: {
    slot: ClubAvailabilitySlot;
    isSelected: boolean;
    onClick: () => void;
}): JSX.Element {
    const startLabel = formatPlainTime(slot.start_time);
    const endLabel = formatPlainTime(slot.end_time);

    return (
        <button
            onClick={onClick}
            className={`flex min-h-12 w-full items-center justify-between rounded-lg border px-3.5 py-2.5 text-left transition-all duration-150 ${
                isSelected
                    ? "border-cta/45 bg-cta/5 shadow-xs ring-1 ring-cta/15"
                    : "border-border bg-card hover:border-border/80 hover:bg-muted/20"
            }`}
        >
            <div className="flex min-w-0 items-center gap-2.5">
                <Clock size={14} className={isSelected ? "text-cta" : "text-muted-foreground/50"} />
                <span
                    className={`truncate text-[13px] font-medium ${isSelected ? "text-foreground" : "text-foreground/80"}`}
                >
                    {startLabel} – {endLabel}
                </span>
            </div>
            <div className="flex items-center gap-2">
                {isSelected ? (
                    <ChevronUp size={13} className="text-cta" />
                ) : (
                    <ChevronDown size={13} className="text-muted-foreground/40" />
                )}
            </div>
        </button>
    );
}

export default function BookByTimeslotView({
    date,
    surface,
    fromTime,
    toTime,
    availability,
    isLoading,
    error,
    selectedSlot,
    isJoining,
    joiningBookingId,
    joinError,
    successMessage,
    warningMessage,
    onDateChange,
    onSurfaceChange,
    onFromTimeChange,
    onFromTimeCommit,
    onToTimeChange,
    onToTimeCommit,
    onSelectSlot,
    onBook,
    onJoin,
    onRefresh,
    onClear,
    onDismissJoinError,
    onDismissSuccess,
    onDismissWarning,
}: Props): JSX.Element {
    const [showOpenGame, setShowOpenGame] = React.useState(true);
    const [showAvailableSlot, setShowAvailableSlot] = React.useState(true);

    const handleAvailableSlotToggle = React.useCallback(
        (checked: boolean) => {
            if (!checked && !showOpenGame) return;
            setShowAvailableSlot(checked);
        },
        [showOpenGame]
    );

    const handleOpenGameToggle = React.useCallback(
        (checked: boolean) => {
            if (!checked && !showAvailableSlot) return;
            setShowOpenGame(checked);
        },
        [showAvailableSlot]
    );

    const allSlots = availability?.days[0]?.slots ?? [];
    const courts = availability?.courts ?? [];

    const slots = allSlots.filter((slot) => {
        const hasOpenGame = slot.existing_matches.length > 0;
        const hasAvailable = slot.available_courts.length > 0;
        if (showOpenGame && showAvailableSlot) return true;
        if (showOpenGame) return hasOpenGame;
        if (showAvailableSlot) return hasAvailable;
        return true;
    });

    const filteredCourts = (): ClubAvailabilityCourt[] => {
        if (!surface) return courts;
        return courts.filter((c) => (c.surface_type as string) === surface);
    };

    const todayIso = new Date().toISOString().slice(0, 10);

    return (
        <div className="w-full space-y-5">
            <Breadcrumb items={[{ label: "Book by timeslot" }]} />
            {joinError ? (
                <AlertToast
                    variant="error"
                    title="Unable to join game"
                    description={joinError}
                    onClose={onDismissJoinError}
                />
            ) : null}
            {successMessage ? (
                <AlertToast variant="success" title={successMessage} onClose={onDismissSuccess} />
            ) : null}
            {warningMessage ? (
                <AlertToast variant="warning" title={warningMessage} onClose={onDismissWarning} />
            ) : null}
            <section className="card-surface overflow-hidden">
                {/* Header */}
                <header className="flex flex-row items-center justify-between gap-3 border-b border-border bg-muted/10 px-5 py-4 sm:px-6">
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2.5">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary text-secondary-foreground shadow-xs">
                                <CalendarDays size={16} />
                            </div>
                            <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                    <h1 className="text-lg font-semibold tracking-tight text-foreground">
                                        Book by timeslot
                                    </h1>
                                </div>
                                <p className="mt-0.5 text-sm text-muted-foreground">
                                    Find and reserve your perfect court
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                        <button
                            onClick={onRefresh}
                            className="btn-outline min-h-10 px-4"
                            aria-label="Refresh court availability"
                        >
                            <RefreshCw size={14} /> Refresh
                        </button>
                    </div>
                </header>

                {/* Filters */}
                <div className="border-b border-border bg-muted/20 px-5 py-4 sm:px-6">
                    {/* Single row: Date / Surface / From / To / Clear */}
                    <div className="grid grid-cols-1 gap-x-3 gap-y-3 sm:grid-cols-[3fr_3fr_3fr_3fr_1fr]">
                        {/* Date */}
                        <div className="flex flex-col gap-1">
                            <span className="text-[11px] font-medium text-muted-foreground">
                                Date
                            </span>
                            <DatePicker
                                value={date}
                                onChange={(v) => onDateChange(v)}
                                placeholder="Select date"
                                minDate={todayIso}
                            />
                        </div>

                        {/* Surface */}
                        <div className="flex flex-col gap-1">
                            <span className="text-[11px] font-medium text-muted-foreground">
                                Surface
                            </span>
                            <SelectInput
                                name="surface"
                                value={surface}
                                options={(SURFACE_OPTIONS as SelectOption[]).filter(
                                    (o) => o.value !== ""
                                )}
                                onValueChange={(v) => onSurfaceChange(v)}
                                placeholder="Any surface"
                                clearLabel="Any surface"
                            />
                        </div>

                        {/* From time */}
                        <div className="flex flex-col gap-1">
                            <span className="text-[11px] font-medium text-muted-foreground">
                                From
                            </span>
                            <TimeInput
                                className="input-base"
                                value={fromTime}
                                onChange={(e) => onFromTimeChange(e.target.value)}
                                onBlur={(e) => onFromTimeCommit(e.target.value)}
                            />
                        </div>

                        {/* To time */}
                        <div className="flex flex-col gap-1">
                            <span className="text-[11px] font-medium text-muted-foreground">
                                To
                            </span>
                            <TimeInput
                                className="input-base"
                                value={toTime}
                                onChange={(e) => onToTimeChange(e.target.value)}
                                onBlur={(e) => onToTimeCommit(e.target.value)}
                            />
                        </div>

                        {/* Clear */}
                        <div className="flex flex-col justify-end">
                            <button
                                onClick={onClear}
                                className="flex h-[38px] w-full items-center justify-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-medium text-muted-foreground transition hover:border-destructive/40 hover:text-destructive"
                            >
                                <X size={12} /> Clear
                            </button>
                        </div>
                    </div>
                </div>

                {/* Two-column layout */}
                <div className="flex min-h-0 flex-col lg:flex-row">
                    {/* Left: time slots */}
                    <div className="w-full shrink-0 border-b border-border/60 lg:w-[340px] lg:border-b-0 lg:border-r">
                        <div className="border-b border-border/60 px-5 py-4">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <h2 className="text-sm font-semibold text-foreground">
                                        Choose a Time
                                    </h2>
                                    <p className="mt-0.5 text-[11px] text-muted-foreground/70">
                                        Tap a slot to view courts
                                    </p>
                                </div>
                                {slots.length > 0 && (
                                    <span className="shrink-0 rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                                        {slots.length} slots
                                    </span>
                                )}
                            </div>
                            <div className="mt-3 flex flex-wrap items-center gap-2">
                                <label
                                    className={`inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-semibold transition-colors ${
                                        showAvailableSlot
                                            ? "border-cta/25 bg-cta/10 text-cta"
                                            : "border-border bg-card text-muted-foreground hover:border-cta/30 hover:text-cta"
                                    }`}
                                >
                                    <input
                                        type="checkbox"
                                        checked={showAvailableSlot}
                                        onChange={(e) =>
                                            handleAvailableSlotToggle(e.target.checked)
                                        }
                                        className="sr-only"
                                    />
                                    <span
                                        className={`flex h-3.5 w-3.5 items-center justify-center rounded-full border ${
                                            showAvailableSlot
                                                ? "border-cta bg-cta"
                                                : "border-muted-foreground/35"
                                        }`}
                                    >
                                        <span
                                            className={`h-1.5 w-1.5 rounded-full bg-cta-foreground transition-opacity ${
                                                showAvailableSlot ? "opacity-100" : "opacity-0"
                                            }`}
                                        />
                                    </span>
                                    Available Slot
                                </label>
                                <label
                                    className={`inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-semibold transition-colors ${
                                        showOpenGame
                                            ? "border-success/25 bg-success/10 text-success"
                                            : "border-border bg-card text-muted-foreground hover:border-success/30 hover:text-success"
                                    }`}
                                >
                                    <input
                                        type="checkbox"
                                        checked={showOpenGame}
                                        onChange={(e) => handleOpenGameToggle(e.target.checked)}
                                        className="sr-only"
                                    />
                                    <span
                                        className={`flex h-3.5 w-3.5 items-center justify-center rounded-full border ${
                                            showOpenGame
                                                ? "border-success bg-success"
                                                : "border-muted-foreground/35"
                                        }`}
                                    >
                                        <span
                                            className={`h-1.5 w-1.5 rounded-full bg-success-foreground transition-opacity ${
                                                showOpenGame ? "opacity-100" : "opacity-0"
                                            }`}
                                        />
                                    </span>
                                    Open Game
                                </label>
                            </div>
                        </div>

                        <div
                            className="space-y-2 overflow-y-auto px-4 py-3"
                            style={{ maxHeight: "520px" }}
                        >
                            {isLoading && (
                                <div className="flex flex-col items-center justify-center gap-3 py-16">
                                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-cta" />
                                    <span className="text-xs text-muted-foreground">
                                        Loading slots…
                                    </span>
                                </div>
                            )}
                            {!isLoading && error && (
                                <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-xs text-destructive">
                                    Failed to load availability. Try refreshing.
                                </div>
                            )}
                            {!isLoading && !error && slots.length === 0 && (
                                <div className="flex flex-col items-center gap-2 py-14 text-center">
                                    <Clock size={24} className="text-muted-foreground/30" />
                                    <p className="text-xs text-muted-foreground">
                                        No slots available for this date.
                                    </p>
                                </div>
                            )}
                            {!isLoading &&
                                slots.map((slot) => (
                                    <SlotRow
                                        key={slot.start_time}
                                        slot={slot}
                                        isSelected={selectedSlot?.start_time === slot.start_time}
                                        onClick={() => onSelectSlot(slot)}
                                    />
                                ))}
                        </div>
                    </div>

                    {/* Right: courts */}
                    <div className="min-w-0 flex-1 bg-muted/5">
                        <div className="border-b border-border/60 px-6 py-3.5">
                            {selectedSlot ? (
                                <div className="flex flex-wrap items-center gap-2">
                                    <h2 className="text-sm font-semibold text-foreground">
                                        Available Courts
                                    </h2>
                                    <span className="rounded-full border border-cta/25 bg-cta/5 px-3 py-0.5 text-[11px] font-semibold text-cta">
                                        {formatPlainTime(selectedSlot.start_time)} –{" "}
                                        {formatPlainTime(selectedSlot.end_time)}
                                    </span>
                                </div>
                            ) : (
                                <h2 className="text-sm font-semibold text-foreground">
                                    Available Courts
                                </h2>
                            )}
                            <p className="mt-0.5 text-[11px] text-muted-foreground/70">
                                {selectedSlot
                                    ? "Select a court to book or join a game"
                                    : "Select a time slot on the left first"}
                            </p>
                        </div>

                        <div
                            className="grid grid-cols-1 gap-2.5 overflow-y-auto px-5 py-4 sm:px-6 xl:grid-cols-2"
                            style={{ maxHeight: "520px" }}
                        >
                            {selectedSlot &&
                                filteredCourts()
                                    .filter((court) => {
                                        const slotCourt = selectedSlot.available_courts.find(
                                            (c) => c.court_id === court.id
                                        );
                                        const existingMatch = selectedSlot.existing_matches.find(
                                            (m) => m.court_id === court.id
                                        );
                                        const isAvailable = slotCourt !== undefined;
                                        const isJoinable =
                                            existingMatch !== undefined &&
                                            existingMatch.slots_available > 0;
                                        if (showAvailableSlot && showOpenGame)
                                            return isAvailable || isJoinable;
                                        if (showAvailableSlot) return isAvailable;
                                        if (showOpenGame) return isJoinable;
                                        return isAvailable || isJoinable;
                                    })
                                    .map((court) => (
                                        <CourtCard
                                            key={court.id}
                                            court={court}
                                            slot={selectedSlot}
                                            isJoining={isJoining}
                                            joiningBookingId={joiningBookingId}
                                            onBook={(courtId) => onBook(courtId, selectedSlot)}
                                            onJoin={onJoin}
                                        />
                                    ))}

                            {!selectedSlot && (
                                <div className="col-span-full flex flex-col items-center justify-center gap-4 py-24 text-center">
                                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/50">
                                        <CalendarDays
                                            size={24}
                                            className="text-muted-foreground/40"
                                        />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground">
                                            No time slot selected
                                        </p>
                                        <p className="mt-0.5 text-xs text-muted-foreground/60">
                                            Pick a slot on the left to see courts
                                        </p>
                                    </div>
                                </div>
                            )}

                            {selectedSlot && filteredCourts().length === 0 && (
                                <div className="col-span-full flex flex-col items-center gap-2 py-14 text-center">
                                    <p className="text-xs text-muted-foreground">
                                        No courts match the selected filters for this slot.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
