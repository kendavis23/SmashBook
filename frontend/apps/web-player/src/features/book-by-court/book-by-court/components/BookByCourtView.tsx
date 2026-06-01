import {
    AlertToast,
    Breadcrumb,
    DatePicker,
    SelectInput,
    TimeInput,
    formatCurrency,
    formatUTCDate,
    formatUTCTime,
} from "@repo/ui";
import {
    CalendarDays,
    ChevronLeft,
    ChevronRight,
    Clock3,
    DoorOpen,
    LayoutGrid,
    Loader2,
    MapPin,
    RefreshCw,
    ShieldCheck,
    Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import type { JSX } from "react";
import { NewBookingModal } from "../../../booking/new-booking/components/NewBookingModal";
import { formatSlotTime } from "../../utils/slotTime";
import type {
    BookingModalState,
    ClubOption,
    Court,
    CourtAvailability,
    JoinStatusFilter,
    OpenGame,
    SurfaceType,
} from "../../types";

export type ClubSectionProps = {
    clubs: ClubOption[];
    selectedId: string;
    selectedName: string;
    onChange: (clubId: string) => void;
};

export type JoinSectionProps = {
    filterDate: string;
    filterStatus: JoinStatusFilter;
    games: OpenGame[];
    isLoading: boolean;
    error: Error | null;
    isJoining: boolean;
    joiningBookingId: string;
    onFilterDateChange: (date: string) => void;
    onFilterStatusChange: (status: JoinStatusFilter) => void;
    onRefresh: () => void;
    onJoinGame: (bookingId: string) => void;
};

export type BookSectionProps = {
    filterDate: string;
    filterSurface: "" | SurfaceType;
    filterTimeFrom: string;
    filterTimeTo: string;
    courts: Court[];
    isLoading: boolean;
    error: Error | null;
    onFilterDateChange: (date: string) => void;
    onFilterSurfaceChange: (surface: "" | SurfaceType) => void;
    onFilterTimeFromChange: (value: string) => void;
    onFilterTimeToChange: (value: string) => void;
    onRefresh: () => void;
    onCheckAvailability: (courtId: string) => void;
};

export type AvailabilitySectionProps = {
    courtId: string;
    data: CourtAvailability | null;
    isLoading: boolean;
    error: Error | null;
    onOpenBooking: (courtId: string, courtName: string, startTime: string) => void;
};

export type FeedbackProps = {
    joinError: string;
    successMessage: string;
    warningMessage: string;
    onDismissJoinError: () => void;
    onDismissSuccess: () => void;
    onDismissWarning: () => void;
};

export type BookByCourtViewProps = {
    currentUserId: string;
    club: ClubSectionProps;
    joinSection: JoinSectionProps;
    bookSection: BookSectionProps;
    availability: AvailabilitySectionProps;
    bookingModal: BookingModalState;
    onCloseBooking: () => void;
    onBookingSuccess: () => void;
    onBookingPaid: () => void;
    feedback: FeedbackProps;
};

const fieldCls = "input-base h-10";

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

function firstAvailableSlot(availability: CourtAvailability | null): string {
    return availability?.slots.find((slot) => slot.is_available)?.start_time ?? "";
}

function slotPriceLabel(price: number | string | null, priceLabel: string | null): string {
    const formattedPrice = formatCurrency(price);
    if (!priceLabel) return formattedPrice;
    if (formattedPrice === "—") return priceLabel;
    return `${priceLabel} · ${formattedPrice}`;
}

export default function BookByCourtView({
    currentUserId,
    club,
    joinSection,
    bookSection,
    availability,
    bookingModal,
    onCloseBooking,
    onBookingSuccess,
    onBookingPaid,
    feedback,
}: BookByCourtViewProps): JSX.Element {
    const checkedCourt = bookSection.courts.find((court) => court.id === availability.courtId);
    const availableSlot = firstAvailableSlot(availability.data);

    const PAGE_SIZE = 3;
    const [openGamesPage, setOpenGamesPage] = useState(0);
    useEffect(() => {
        setOpenGamesPage(0);
    }, [joinSection.games]);
    const totalPages = Math.ceil(joinSection.games.length / PAGE_SIZE);
    const pagedOpenGames = joinSection.games.slice(
        openGamesPage * PAGE_SIZE,
        (openGamesPage + 1) * PAGE_SIZE
    );

    const COURTS_PAGE_SIZE = 4;
    const [courtsPage, setCourtsPage] = useState(0);
    useEffect(() => {
        setCourtsPage(0);
    }, [bookSection.courts]);
    const courtsTotalPages = Math.ceil(bookSection.courts.length / COURTS_PAGE_SIZE);
    const pagedCourts = bookSection.courts.slice(
        courtsPage * COURTS_PAGE_SIZE,
        (courtsPage + 1) * COURTS_PAGE_SIZE
    );

    return (
        <div className="w-full space-y-5">
            <Breadcrumb items={[{ label: "Book by court" }]} />

            <section className="card-surface overflow-hidden">
                <header className="flex flex-row items-center justify-between gap-3 border-b border-border bg-muted/10 px-5 py-4 sm:px-6">
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2.5">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary text-secondary-foreground shadow-xs">
                                <LayoutGrid size={16} />
                            </div>
                            <div className="min-w-0">
                                <h1 className="text-lg font-semibold tracking-tight text-foreground">
                                    Book by court
                                </h1>
                                <p className="mt-0.5 text-sm text-muted-foreground">
                                    {club.selectedName
                                        ? `${club.selectedName} options`
                                        : "Select a club to see available options"}
                                </p>
                            </div>
                        </div>
                    </div>
                </header>
            </section>

            {feedback.joinError ? (
                <AlertToast
                    variant="error"
                    title="Unable to join game"
                    description={feedback.joinError}
                    onClose={feedback.onDismissJoinError}
                />
            ) : null}

            {feedback.successMessage ? (
                <AlertToast
                    variant="success"
                    title={feedback.successMessage}
                    onClose={feedback.onDismissSuccess}
                />
            ) : null}

            {feedback.warningMessage ? (
                <AlertToast
                    variant="warning"
                    title={feedback.warningMessage}
                    onClose={feedback.onDismissWarning}
                />
            ) : null}

            <div className="grid gap-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.25fr)]">
                <section className="rounded-lg border border-border bg-card shadow-sm">
                    <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
                        <div>
                            <h2 className="text-base font-semibold text-foreground">Join</h2>
                            <p className="text-xs text-muted-foreground">
                                Open games needing players
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={joinSection.onRefresh}
                            className="btn-ghost-sm"
                        >
                            <RefreshCw size={13} />
                            Refresh
                        </button>
                    </div>

                    <div className="grid gap-3 border-b border-border px-4 py-3 sm:grid-cols-2">
                        <label className="flex flex-col gap-1.5">
                            <span className="text-xs font-semibold text-muted-foreground">
                                Date
                            </span>
                            <DatePicker
                                value={joinSection.filterDate}
                                onChange={joinSection.onFilterDateChange}
                                placeholder="All dates"
                                className={fieldCls}
                            />
                        </label>
                        <label className="flex flex-col gap-1.5">
                            <span className="text-xs font-semibold text-muted-foreground">
                                Status
                            </span>
                            <SelectInput
                                value={joinSection.filterStatus}
                                onValueChange={(v) =>
                                    joinSection.onFilterStatusChange(v as JoinStatusFilter)
                                }
                                options={[
                                    { value: "all", label: "All" },
                                    { value: "open", label: "Open" },
                                    { value: "joined", label: "Joined" },
                                ]}
                                className={fieldCls}
                            />
                        </label>
                    </div>

                    <div className="p-4">
                        {joinSection.error ? (
                            <div className="feedback-error">{joinSection.error.message}</div>
                        ) : joinSection.isLoading ? (
                            <div className="flex items-center justify-center gap-2 py-14 text-sm text-muted-foreground">
                                <Loader2 size={16} className="animate-spin" />
                                Loading open games
                            </div>
                        ) : joinSection.games.length === 0 ? (
                            <div className="rounded-lg border border-dashed border-border bg-muted/20 px-4 py-10 text-center">
                                <DoorOpen className="mx-auto text-muted-foreground" size={24} />
                                <p className="mt-3 text-sm font-medium text-foreground">
                                    No open games yet
                                </p>
                                <p className="mt-1 text-xs text-muted-foreground">
                                    Check courts on the right and create one for others to join.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {pagedOpenGames.map((game) => {
                                    const hasJoinedCard = game.players.some(
                                        (p) =>
                                            p.user_id === currentUserId &&
                                            p.invite_status === "accepted"
                                    );
                                    return (
                                        <article
                                            key={game.id}
                                            className={`rounded-lg border p-4 ${hasJoinedCard ? "border-success/40 bg-success/5" : "border-border bg-background"}`}
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="min-w-0">
                                                    <h3 className="truncate text-sm font-semibold text-foreground">
                                                        {game.court_name}
                                                    </h3>
                                                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
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
                                                <span className="rounded-full bg-success/15 px-2.5 py-1 text-xs font-semibold text-success">
                                                    {game.slots_available} slot
                                                    {game.slots_available === 1 ? "" : "s"}
                                                </span>
                                            </div>

                                            <div className="mt-4 flex items-center justify-between gap-3">
                                                <div className="text-xs text-muted-foreground">
                                                    <span className="font-medium text-foreground">
                                                        {formatCurrency(game.total_price)}
                                                    </span>
                                                    {game.min_skill_level ||
                                                    game.max_skill_level ? (
                                                        <span className="ml-2">
                                                            Skill {game.min_skill_level ?? "-"}-
                                                            {game.max_skill_level ?? "-"}
                                                        </span>
                                                    ) : null}
                                                </div>
                                                {(() => {
                                                    const hasJoined = game.players.some(
                                                        (p) =>
                                                            p.user_id === currentUserId &&
                                                            p.invite_status === "accepted"
                                                    );
                                                    return hasJoined ? (
                                                        <button
                                                            type="button"
                                                            disabled
                                                            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground"
                                                        >
                                                            <Users size={13} />
                                                            Joined
                                                        </button>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                joinSection.onJoinGame(game.id)
                                                            }
                                                            disabled={joinSection.isJoining}
                                                            className="btn-cta-sm"
                                                        >
                                                            {joinSection.joiningBookingId ===
                                                            game.id ? (
                                                                <Loader2
                                                                    size={13}
                                                                    className="animate-spin"
                                                                />
                                                            ) : (
                                                                <Users size={13} />
                                                            )}
                                                            Join
                                                        </button>
                                                    );
                                                })()}
                                            </div>
                                        </article>
                                    );
                                })}
                                {totalPages > 1 && (
                                    <div className="flex items-center justify-between pt-1">
                                        <span className="text-xs text-muted-foreground">
                                            Page {openGamesPage + 1} of {totalPages}
                                        </span>
                                        <div className="flex items-center gap-1">
                                            <button
                                                type="button"
                                                onClick={() => setOpenGamesPage((p) => p - 1)}
                                                disabled={openGamesPage === 0}
                                                className="btn-ghost-sm px-1.5"
                                            >
                                                <ChevronLeft size={14} />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setOpenGamesPage((p) => p + 1)}
                                                disabled={openGamesPage >= totalPages - 1}
                                                className="btn-ghost-sm px-1.5"
                                            >
                                                <ChevronRight size={14} />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </section>

                <section className="rounded-lg border border-border bg-card shadow-sm">
                    <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
                        <div>
                            <h2 className="text-base font-semibold text-foreground">Book</h2>
                            <p className="text-xs text-muted-foreground">
                                Check courts and reserve a slot
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={bookSection.onRefresh}
                            className="btn-ghost-sm"
                        >
                            <RefreshCw size={13} />
                            Refresh
                        </button>
                    </div>

                    <div className="grid gap-3 border-b border-border px-4 py-3 sm:grid-cols-2 xl:grid-cols-4">
                        <label className="flex flex-col gap-1.5">
                            <span className="text-xs font-semibold text-muted-foreground">
                                Date
                            </span>
                            <DatePicker
                                value={bookSection.filterDate}
                                onChange={bookSection.onFilterDateChange}
                                className={fieldCls}
                            />
                        </label>
                        <label className="flex flex-col gap-1.5">
                            <span className="text-xs font-semibold text-muted-foreground">
                                Surface
                            </span>
                            <SelectInput
                                value={bookSection.filterSurface}
                                onValueChange={(value) =>
                                    bookSection.onFilterSurfaceChange(value as "" | SurfaceType)
                                }
                                options={[
                                    { value: "indoor", label: "Indoor" },
                                    { value: "outdoor", label: "Outdoor" },
                                    { value: "crystal", label: "Crystal" },
                                    { value: "artificial_grass", label: "Artificial grass" },
                                ]}
                                clearLabel="Any"
                                placeholder="Any"
                                className={fieldCls}
                            />
                        </label>
                        <label className="flex flex-col gap-1.5">
                            <span className="text-xs font-semibold text-muted-foreground">
                                From
                            </span>
                            <TimeInput
                                value={bookSection.filterTimeFrom}
                                onChange={(event) =>
                                    bookSection.onFilterTimeFromChange(event.target.value)
                                }
                                className={fieldCls}
                            />
                        </label>
                        <label className="flex flex-col gap-1.5">
                            <span className="text-xs font-semibold text-muted-foreground">To</span>
                            <TimeInput
                                value={bookSection.filterTimeTo}
                                onChange={(event) =>
                                    bookSection.onFilterTimeToChange(event.target.value)
                                }
                                className={fieldCls}
                            />
                        </label>
                    </div>

                    <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(280px,1fr)]">
                        <div className="space-y-3">
                            {bookSection.error ? (
                                <div className="feedback-error">{bookSection.error.message}</div>
                            ) : bookSection.isLoading ? (
                                <div className="flex items-center justify-center gap-2 py-14 text-sm text-muted-foreground">
                                    <Loader2 size={16} className="animate-spin" />
                                    Loading courts
                                </div>
                            ) : bookSection.courts.length === 0 ? (
                                <div className="rounded-lg border border-dashed border-border bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground">
                                    No courts are available for this club.
                                </div>
                            ) : (
                                <>
                                    {pagedCourts.map((court) => (
                                        <article
                                            key={court.id}
                                            className={`rounded-lg border p-4 transition-colors ${
                                                court.id === availability.courtId
                                                    ? "border-cta/35 bg-cta/5"
                                                    : "border-border bg-background"
                                            }`}
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="min-w-0">
                                                    <h3 className="truncate text-sm font-semibold text-foreground">
                                                        {court.name}
                                                    </h3>
                                                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                                                        <span className="inline-flex items-center gap-1">
                                                            <MapPin size={13} />
                                                            {surfaceLabel(court.surface_type)}
                                                        </span>
                                                        {court.has_lighting ? (
                                                            <span className="inline-flex items-center gap-1">
                                                                <ShieldCheck size={13} />
                                                                Lighting
                                                            </span>
                                                        ) : null}
                                                        {court.lighting_surcharge != null &&
                                                        court.lighting_surcharge > 0 ? (
                                                            <span className="inline-flex items-center gap-1">
                                                                +{" "}
                                                                {formatCurrency(
                                                                    court.lighting_surcharge
                                                                )}{" "}
                                                                lighting
                                                            </span>
                                                        ) : null}
                                                    </div>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        bookSection.onCheckAvailability(court.id)
                                                    }
                                                    disabled={!court.is_active}
                                                    className="btn-outline shrink-0 px-2.5 py-1.5 text-xs"
                                                >
                                                    Availability
                                                </button>
                                            </div>
                                        </article>
                                    ))}
                                    {courtsTotalPages > 1 && (
                                        <div className="flex items-center justify-between pt-1">
                                            <span className="text-xs text-muted-foreground">
                                                Page {courtsPage + 1} of {courtsTotalPages}
                                            </span>
                                            <div className="flex items-center gap-1">
                                                <button
                                                    type="button"
                                                    onClick={() => setCourtsPage((p) => p - 1)}
                                                    disabled={courtsPage === 0}
                                                    className="btn-ghost-sm px-1.5"
                                                >
                                                    <ChevronLeft size={14} />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setCourtsPage((p) => p + 1)}
                                                    disabled={courtsPage >= courtsTotalPages - 1}
                                                    className="btn-ghost-sm px-1.5"
                                                >
                                                    <ChevronRight size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        <div className="rounded-lg border border-border bg-background p-4">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <h3 className="text-sm font-semibold text-foreground">
                                        {checkedCourt ? checkedCourt.name : "Court availability"}
                                    </h3>
                                    <p className="mt-1 text-xs text-muted-foreground">
                                        {checkedCourt
                                            ? `Slots for ${bookSection.filterDate}`
                                            : "Choose a court to see bookable slots."}
                                    </p>
                                </div>
                                {availableSlot ? (
                                    <span className="rounded-full bg-success/15 px-2.5 py-1 text-xs font-semibold text-success">
                                        Available
                                    </span>
                                ) : null}
                            </div>

                            <div className="mt-4">
                                {availability.error ? (
                                    <div className="feedback-error">
                                        {availability.error.message}
                                    </div>
                                ) : availability.isLoading ? (
                                    <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
                                        <Loader2 size={16} className="animate-spin" />
                                        Checking availability
                                    </div>
                                ) : !availability.courtId ? (
                                    <div className="rounded-lg border border-dashed border-border bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground">
                                        Select Check Availability on a court.
                                    </div>
                                ) : availability.data?.slots.length ? (
                                    <div className="grid grid-cols-2 gap-2">
                                        {availability.data.slots.map((slot) => (
                                            <button
                                                key={`${slot.start_time}-${slot.end_time}`}
                                                type="button"
                                                disabled={!slot.is_available || !checkedCourt}
                                                onClick={() =>
                                                    checkedCourt &&
                                                    availability.onOpenBooking(
                                                        checkedCourt.id,
                                                        checkedCourt.name,
                                                        slot.start_time
                                                    )
                                                }
                                                className={`h-14 rounded-lg border px-2.5 py-2 text-left transition ${
                                                    slot.is_available
                                                        ? "border-success/30 bg-success/10 hover:bg-success/15"
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
                                    <div className="rounded-lg border border-dashed border-border bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground">
                                        No slots returned for this court.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </section>
            </div>

            {bookingModal ? (
                <NewBookingModal
                    courtId={bookingModal.courtId}
                    courtName={bookingModal.courtName}
                    date={bookingModal.date}
                    startTime={bookingModal.startTime}
                    paymentDeadlineIso={bookingModal.paymentDeadlineIso}
                    onClose={onCloseBooking}
                    onSuccess={onBookingSuccess}
                    onPaymentSuccess={onBookingPaid}
                />
            ) : null}
        </div>
    );
}
