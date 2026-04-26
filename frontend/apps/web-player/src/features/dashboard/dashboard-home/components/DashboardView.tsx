import {
    AlertToast,
    DatePicker,
    NumberInput,
    SelectInput,
    TimeInput,
    formatCurrency,
    formatUTCDate,
    formatUTCTime,
} from "@repo/ui";
import {
    CalendarDays,
    Clock3,
    DoorOpen,
    Loader2,
    MapPin,
    RefreshCw,
    ShieldCheck,
    Users,
} from "lucide-react";
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
    joinFilterMinSkill: string;
    joinFilterMaxSkill: string;
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
    onJoinFilterMinSkillChange: (value: string) => void;
    onJoinFilterMaxSkillChange: (value: string) => void;
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

export default function DashboardView({
    clubs,
    selectedClubId,
    selectedClubName,
    joinFilterDate,
    joinFilterMinSkill,
    joinFilterMaxSkill,
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
    onJoinFilterMinSkillChange,
    onJoinFilterMaxSkillChange,
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
    const checkedCourt = courts.find((court) => court.id === availabilityCourtId);
    const availableSlot = firstAvailableSlot(availability);

    return (
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-5">
            <section className="rounded-lg border border-border bg-card px-4 py-2.5 shadow-sm sm:px-5">
                <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                        <h1 className="text-lg font-semibold tracking-tight text-foreground">
                            Book a court or join a game
                        </h1>
                        <p className="text-xs text-muted-foreground">
                            {selectedClubName
                                ? `${selectedClubName} options`
                                : "Select a club to see available options"}
                        </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                        <span className="text-xs font-semibold text-muted-foreground">Club</span>
                        <SelectInput
                            value={selectedClubId}
                            onValueChange={onClubChange}
                            options={clubs.map((club) => ({
                                value: club.id,
                                label: club.name,
                            }))}
                            placeholder="Select club"
                            className="input-base h-8 w-[200px] text-sm"
                        />
                    </div>
                </div>
            </section>

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

            <div className="grid gap-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.25fr)]">
                <section className="rounded-lg border border-border bg-card shadow-sm">
                    <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
                        <div>
                            <h2 className="text-base font-semibold text-foreground">Join</h2>
                            <p className="text-xs text-muted-foreground">
                                Open games needing players
                            </p>
                        </div>
                        <button type="button" onClick={onRefreshOpenGames} className="btn-ghost-sm">
                            <RefreshCw size={13} />
                            Refresh
                        </button>
                    </div>

                    <div className="grid gap-3 border-b border-border px-4 py-3 sm:grid-cols-3">
                        <label className="flex flex-col gap-1.5">
                            <span className="text-xs font-semibold text-muted-foreground">
                                Date
                            </span>
                            <DatePicker
                                value={joinFilterDate}
                                onChange={onJoinFilterDateChange}
                                placeholder="All dates"
                                className={fieldCls}
                            />
                        </label>
                        <label className="flex flex-col gap-1.5">
                            <span className="text-xs font-semibold text-muted-foreground">
                                Min skill
                            </span>
                            <NumberInput
                                min="0"
                                step="0.1"
                                value={joinFilterMinSkill}
                                onChange={(event) => onJoinFilterMinSkillChange(event.target.value)}
                                className={fieldCls}
                                placeholder="Any"
                            />
                        </label>
                        <label className="flex flex-col gap-1.5">
                            <span className="text-xs font-semibold text-muted-foreground">
                                Max skill
                            </span>
                            <NumberInput
                                min="0"
                                step="0.1"
                                value={joinFilterMaxSkill}
                                onChange={(event) => onJoinFilterMaxSkillChange(event.target.value)}
                                className={fieldCls}
                                placeholder="Any"
                            />
                        </label>
                    </div>

                    <div className="p-4">
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
                                    Check courts on the right and create one for others to join.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {openGames.map((game) => (
                                    <article
                                        key={game.id}
                                        className="rounded-lg border border-border bg-background p-4"
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
                                                className="btn-cta-sm"
                                            >
                                                {joiningBookingId === game.id ? (
                                                    <Loader2 size={13} className="animate-spin" />
                                                ) : (
                                                    <Users size={13} />
                                                )}
                                                Join
                                            </button>
                                        </div>
                                    </article>
                                ))}
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
                        <button type="button" onClick={onRefreshCourts} className="btn-ghost-sm">
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
                                value={bookFilterDate}
                                onChange={onBookFilterDateChange}
                                className={fieldCls}
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
                                className={fieldCls}
                            />
                        </label>
                        <label className="flex flex-col gap-1.5">
                            <span className="text-xs font-semibold text-muted-foreground">
                                From
                            </span>
                            <TimeInput
                                value={bookFilterTimeFrom}
                                onChange={(event) => onBookFilterTimeFromChange(event.target.value)}
                                className={fieldCls}
                            />
                        </label>
                        <label className="flex flex-col gap-1.5">
                            <span className="text-xs font-semibold text-muted-foreground">To</span>
                            <TimeInput
                                value={bookFilterTimeTo}
                                onChange={(event) => onBookFilterTimeToChange(event.target.value)}
                                className={fieldCls}
                            />
                        </label>
                    </div>

                    <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(280px,1fr)]">
                        <div className="space-y-3">
                            {courtsError ? (
                                <div className="feedback-error">{courtsError.message}</div>
                            ) : isCourtsLoading ? (
                                <div className="flex items-center justify-center gap-2 py-14 text-sm text-muted-foreground">
                                    <Loader2 size={16} className="animate-spin" />
                                    Loading courts
                                </div>
                            ) : courts.length === 0 ? (
                                <div className="rounded-lg border border-dashed border-border bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground">
                                    No courts are available for this club.
                                </div>
                            ) : (
                                courts.map((court) => (
                                    <article
                                        key={court.id}
                                        className={`rounded-lg border p-4 transition-colors ${
                                            court.id === availabilityCourtId
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
                                                onClick={() => onCheckAvailability(court.id)}
                                                disabled={!court.is_active}
                                                className="btn-outline shrink-0 px-2.5 py-1.5 text-xs"
                                            >
                                                Availability
                                            </button>
                                        </div>
                                    </article>
                                ))
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
                                            ? `Slots for ${bookFilterDate}`
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
                                {availabilityError ? (
                                    <div className="feedback-error">
                                        {availabilityError.message}
                                    </div>
                                ) : isAvailabilityLoading ? (
                                    <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
                                        <Loader2 size={16} className="animate-spin" />
                                        Checking availability
                                    </div>
                                ) : !availabilityCourtId ? (
                                    <div className="rounded-lg border border-dashed border-border bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground">
                                        Select Check Availability on a court.
                                    </div>
                                ) : availability?.slots.length ? (
                                    <div className="grid grid-cols-2 gap-2">
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
                    onClose={onCloseBooking}
                    onSuccess={onBookingSuccess}
                />
            ) : null}
        </div>
    );
}
