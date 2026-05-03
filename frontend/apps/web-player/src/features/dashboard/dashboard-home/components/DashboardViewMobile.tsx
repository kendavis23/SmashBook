import {
    AlertToast,
    DatePicker,
    SelectInput,
    TimeInput,
    formatCurrency,
    formatUTCDate,
    formatUTCTime,
} from "@repo/ui";
import { CalendarDays, Clock3, DoorOpen, Loader2, MapPin, ShieldCheck, Users } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { JSX } from "react";
import { NewBookingModal } from "../../../booking/new-booking/components/NewBookingModal";
import { formatSlotTime } from "../../utils/slotTime";
import type {
    BookingModalState,
    ClubOption,
    Court,
    CourtAvailability,
    OpenGame,
    SurfaceType,
} from "../../types";

type Props = {
    clubs: ClubOption[];
    selectedClubId: string;
    selectedClubName: string;
    joinFilterDate: string;
    bookFilterDate: string;
    bookFilterSurfaceType: "" | SurfaceType;
    bookFilterTimeFrom: string;
    bookFilterTimeTo: string;
    openGames: OpenGame[];
    courts: Court[];
    availability: CourtAvailability | null;
    availabilityCourtId: string;
    bookingModal: BookingModalState;
    isOpenGamesLoading: boolean;
    isCourtsLoading: boolean;
    isAvailabilityLoading: boolean;
    isJoining: boolean;
    joiningBookingId: string;
    openGamesError: Error | null;
    courtsError: Error | null;
    availabilityError: Error | null;
    joinError: string;
    successMessage: string;
    onClubChange: (clubId: string) => void;
    onJoinFilterDateChange: (date: string) => void;
    onBookFilterDateChange: (date: string) => void;
    onBookFilterSurfaceTypeChange: (surfaceType: "" | SurfaceType) => void;
    onBookFilterTimeFromChange: (value: string) => void;
    onBookFilterTimeToChange: (value: string) => void;
    onCheckAvailability: (courtId: string) => void;
    onRefreshOpenGames: () => void;
    onRefreshCourts: () => void;
    onJoinGame: (bookingId: string) => void;
    onOpenBooking: (courtId: string, courtName: string, startTime: string) => void;
    onCloseBooking: () => void;
    onBookingSuccess: () => void;
    onDismissJoinError: () => void;
    onDismissSuccess: () => void;
};

type ActiveTab = "join" | "book";

const mobileFieldCls = "input-base h-11 rounded-lg text-sm";

function timeLabel(value: string): string {
    const raw = value.includes("T") ? formatUTCTime(value) : formatSlotTime(value);
    return raw.replace(/\s?(AM|PM)$/i, (_, p) => p.toLowerCase());
}

function surfaceLabel(value: string): string {
    return value
        .split("_")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
}

function slotPriceLabel(price: number | string | null, priceLabel: string | null): string {
    const formattedPrice = formatCurrency(price);
    if (!priceLabel) return formattedPrice;
    if (formattedPrice === "—") return priceLabel;
    return `${priceLabel} · ${formattedPrice}`;
}

export default function DashboardViewMobile({
    clubs,
    selectedClubId,
    selectedClubName,
    joinFilterDate,
    bookFilterDate,
    bookFilterSurfaceType,
    bookFilterTimeFrom,
    bookFilterTimeTo,
    openGames,
    courts,
    availability,
    availabilityCourtId,
    bookingModal,
    isOpenGamesLoading,
    isCourtsLoading,
    isAvailabilityLoading,
    isJoining,
    joiningBookingId,
    openGamesError,
    courtsError,
    availabilityError,
    joinError,
    successMessage,
    onClubChange,
    onJoinFilterDateChange,
    onBookFilterDateChange,
    onBookFilterSurfaceTypeChange,
    onBookFilterTimeFromChange,
    onBookFilterTimeToChange,
    onCheckAvailability,
    onRefreshOpenGames,
    onRefreshCourts,
    onJoinGame,
    onOpenBooking,
    onCloseBooking,
    onBookingSuccess,
    onDismissJoinError,
    onDismissSuccess,
}: Props): JSX.Element {
    const [activeTab, setActiveTab] = useState<ActiveTab>("join");
    const scrollRef = useRef<HTMLDivElement>(null);

    const checkedCourt = courts.find((court) => court.id === availabilityCourtId);

    // Auto-select first court when courts load on book tab
    useEffect(() => {
        const firstCourt = courts[0];
        if (activeTab === "book" && firstCourt && !availabilityCourtId) {
            onCheckAvailability(firstCourt.id);
        }
    }, [activeTab, courts, availabilityCourtId, onCheckAvailability]);

    // Refresh when switching tabs
    useEffect(() => {
        if (activeTab === "join") onRefreshOpenGames();
        else onRefreshCourts();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab]);

    return (
        <div className="-mx-[var(--page-padding)] -mt-[var(--page-padding)] flex min-h-[calc(100dvh-var(--nav-height))] flex-col gap-3 bg-background pb-6">
            {/* Club selector */}
            <div className="border-b border-border bg-card px-3 pb-3 pt-3 shadow-sm">
                <p className="mb-2 truncate text-xs font-medium text-muted-foreground">
                    {selectedClubName || "Select a club"}
                </p>
                <SelectInput
                    value={selectedClubId}
                    onValueChange={onClubChange}
                    options={clubs.map((club) => ({ value: club.id, label: club.name }))}
                    placeholder="Select club"
                    className="input-base h-11 w-full rounded-lg text-sm font-semibold"
                />
            </div>

            {/* Toasts */}
            {joinError ? (
                <div className="px-3">
                    <AlertToast
                        variant="error"
                        title="Unable to join game"
                        description={joinError}
                        onClose={onDismissJoinError}
                    />
                </div>
            ) : null}
            {successMessage ? (
                <div className="px-3">
                    <AlertToast
                        variant="success"
                        title={successMessage}
                        onClose={onDismissSuccess}
                    />
                </div>
            ) : null}

            {/* Segmented tabs */}
            <div className="sticky top-0 z-10 mx-3 flex rounded-lg border border-border bg-muted/40 p-1 shadow-xs backdrop-blur">
                <button
                    type="button"
                    onClick={() => setActiveTab("join")}
                    className={`min-h-10 flex-1 rounded-md py-2 text-sm font-semibold transition-colors ${
                        activeTab === "join"
                            ? "bg-card text-foreground shadow-sm"
                            : "text-muted-foreground"
                    }`}
                >
                    Join
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab("book")}
                    className={`min-h-10 flex-1 rounded-md py-2 text-sm font-semibold transition-colors ${
                        activeTab === "book"
                            ? "bg-card text-foreground shadow-sm"
                            : "text-muted-foreground"
                    }`}
                >
                    Book
                </button>
            </div>

            {/* JOIN TAB */}
            {activeTab === "join" && (
                <div className="flex flex-col gap-3 px-3">
                    {/* Date filter */}
                    <label className="flex flex-col gap-1.5">
                        <span className="text-xs font-semibold text-muted-foreground">Date</span>
                        <DatePicker
                            value={joinFilterDate}
                            onChange={onJoinFilterDateChange}
                            placeholder="All dates"
                            className={mobileFieldCls}
                        />
                    </label>

                    {/* Open games list */}
                    {openGamesError ? (
                        <div className="feedback-error">{openGamesError.message}</div>
                    ) : isOpenGamesLoading ? (
                        <div className="flex items-center justify-center gap-2 py-14 text-sm text-muted-foreground">
                            <Loader2 size={16} className="animate-spin" />
                            Loading open games
                        </div>
                    ) : openGames.length === 0 ? (
                        <div className="rounded-lg border border-dashed border-border bg-muted/20 px-4 py-10 text-center">
                            <DoorOpen className="mx-auto text-muted-foreground" size={24} />
                            <p className="mt-3 text-sm font-medium text-foreground">
                                No open games yet
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                                Switch to Book to reserve a court and create one.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {openGames.map((game) => (
                                <article
                                    key={game.id}
                                    className="rounded-lg border border-border bg-card p-3.5 shadow-sm"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <h3 className="truncate text-[15px] font-semibold text-foreground">
                                                {game.court_name}
                                            </h3>
                                            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
                                                <span className="inline-flex items-center gap-1">
                                                    <CalendarDays size={13} />
                                                    {formatUTCDate(game.start_datetime)}
                                                </span>
                                                <span className="inline-flex items-center gap-1">
                                                    <Clock3 size={13} />
                                                    {formatUTCTime(game.start_datetime)}-
                                                    {formatUTCTime(game.end_datetime)}
                                                </span>
                                            </div>
                                        </div>
                                        <span className="shrink-0 rounded-full bg-success/15 px-2.5 py-1 text-xs font-semibold text-success">
                                            {game.slots_available} slot
                                            {game.slots_available === 1 ? "" : "s"}
                                        </span>
                                    </div>

                                    <div className="mt-4 flex items-center justify-between gap-3">
                                        <div className="text-xs text-muted-foreground">
                                            <span className="font-semibold text-foreground">
                                                {formatCurrency(game.total_price)}
                                            </span>
                                            {game.min_skill_level || game.max_skill_level ? (
                                                <span className="ml-2">
                                                    Skill {game.min_skill_level ?? "-"}-
                                                    {game.max_skill_level ?? "-"}
                                                </span>
                                            ) : null}
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => onJoinGame(game.id)}
                                            disabled={isJoining}
                                            className="btn-cta min-h-11 shrink-0 rounded-lg px-4 text-sm font-semibold"
                                        >
                                            {joiningBookingId === game.id ? (
                                                <Loader2 size={14} className="animate-spin" />
                                            ) : (
                                                <Users size={14} />
                                            )}
                                            Join
                                        </button>
                                    </div>
                                </article>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* BOOK TAB */}
            {activeTab === "book" && (
                <div className="flex flex-col gap-4">
                    {/* Filters: 2 per row */}
                    <div className="grid grid-cols-2 gap-3 px-3">
                        <label className="flex flex-col gap-1.5">
                            <span className="text-xs font-semibold text-muted-foreground">
                                Date
                            </span>
                            <DatePicker
                                value={bookFilterDate}
                                onChange={onBookFilterDateChange}
                                className={mobileFieldCls}
                            />
                        </label>
                        <label className="flex flex-col gap-1.5">
                            <span className="text-xs font-semibold text-muted-foreground">
                                Surface
                            </span>
                            <SelectInput
                                value={bookFilterSurfaceType}
                                onValueChange={(value) =>
                                    onBookFilterSurfaceTypeChange(value as "" | SurfaceType)
                                }
                                options={[
                                    { value: "indoor", label: "Indoor" },
                                    { value: "outdoor", label: "Outdoor" },
                                    { value: "crystal", label: "Crystal" },
                                    { value: "artificial_grass", label: "Artificial grass" },
                                ]}
                                clearLabel="Any"
                                placeholder="Any"
                                className={mobileFieldCls}
                            />
                        </label>
                        <label className="flex flex-col gap-1.5">
                            <span className="text-xs font-semibold text-muted-foreground">
                                From
                            </span>
                            <TimeInput
                                value={bookFilterTimeFrom}
                                onChange={(e) => onBookFilterTimeFromChange(e.target.value)}
                                className={mobileFieldCls}
                            />
                        </label>
                        <label className="flex flex-col gap-1.5">
                            <span className="text-xs font-semibold text-muted-foreground">To</span>
                            <TimeInput
                                value={bookFilterTimeTo}
                                onChange={(e) => onBookFilterTimeToChange(e.target.value)}
                                className={mobileFieldCls}
                            />
                        </label>
                    </div>

                    {/* Courts horizontal scroll */}
                    {courtsError ? (
                        <div className="feedback-error mx-3">{courtsError.message}</div>
                    ) : isCourtsLoading ? (
                        <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
                            <Loader2 size={16} className="animate-spin" />
                            Loading courts
                        </div>
                    ) : courts.length === 0 ? (
                        <div className="mx-3 rounded-lg border border-dashed border-border bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
                            No courts available for this club.
                        </div>
                    ) : (
                        <>
                            {/* Scrollable court chips */}
                            <div
                                ref={scrollRef}
                                className="flex gap-2 overflow-x-auto px-3 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                            >
                                {courts.map((court) => (
                                    <button
                                        key={court.id}
                                        type="button"
                                        disabled={!court.is_active}
                                        onClick={() => onCheckAvailability(court.id)}
                                        className={`min-h-10 shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${
                                            court.id === availabilityCourtId
                                                ? "border-cta bg-cta text-white"
                                                : "border-border bg-card text-foreground"
                                        }`}
                                    >
                                        {court.name}
                                    </button>
                                ))}
                            </div>

                            {/* Selected court info + availability */}
                            <div className="mx-3 rounded-lg border border-border bg-card p-3.5 shadow-sm">
                                {checkedCourt ? (
                                    <div className="mb-3 flex items-center justify-between gap-2">
                                        <div>
                                            <p className="text-[15px] font-semibold text-foreground">
                                                {checkedCourt.name}
                                            </p>
                                            <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                                                <span className="inline-flex items-center gap-1">
                                                    <MapPin size={12} />
                                                    {surfaceLabel(checkedCourt.surface_type)}
                                                </span>
                                                {checkedCourt.has_lighting ? (
                                                    <span className="inline-flex items-center gap-1">
                                                        <ShieldCheck size={12} />
                                                        Lighting
                                                    </span>
                                                ) : null}
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="mb-3 text-sm text-muted-foreground">
                                        Select a court above to see available slots.
                                    </p>
                                )}

                                {availabilityError ? (
                                    <div className="feedback-error">
                                        {availabilityError.message}
                                    </div>
                                ) : isAvailabilityLoading ? (
                                    <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
                                        <Loader2 size={16} className="animate-spin" />
                                        Checking availability
                                    </div>
                                ) : !availabilityCourtId ? (
                                    <div className="rounded-lg border border-dashed border-border bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
                                        Select a court to see bookable slots.
                                    </div>
                                ) : availability?.slots.length ? (
                                    <div className="grid grid-cols-2 gap-2.5">
                                        {availability.slots.map((slot) => (
                                            <button
                                                key={`${slot.start_time}-${slot.end_time}`}
                                                type="button"
                                                disabled={!slot.is_available || !checkedCourt}
                                                onClick={() =>
                                                    checkedCourt &&
                                                    onOpenBooking(
                                                        checkedCourt.id,
                                                        checkedCourt.name,
                                                        slot.start_time
                                                    )
                                                }
                                                className={`h-14 rounded-lg border px-2.5 py-2 text-left transition ${
                                                    slot.is_available
                                                        ? "border-success/30 bg-success/10 active:bg-success/20"
                                                        : "border-border bg-muted/35 opacity-60"
                                                }`}
                                            >
                                                <span className="block truncate text-xs font-medium text-foreground">
                                                    {timeLabel(slot.start_time)} –{" "}
                                                    {timeLabel(slot.end_time)}
                                                </span>
                                                <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                                                    {slot.is_available
                                                        ? slotPriceLabel(
                                                              slot.price,
                                                              slot.price_label
                                                          )
                                                        : "Booked"}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="rounded-lg border border-dashed border-border bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
                                        No slots returned for this court.
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            )}

            {bookingModal ? (
                <NewBookingModal
                    courtId={bookingModal.courtId}
                    courtName={bookingModal.courtName}
                    date={bookingModal.date}
                    startTime={bookingModal.startTime}
                    onClose={onCloseBooking}
                    onSuccess={onBookingSuccess}
                />
            ) : null}
        </div>
    );
}
