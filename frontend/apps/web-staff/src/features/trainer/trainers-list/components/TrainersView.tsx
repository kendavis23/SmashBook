import type { JSX } from "react";
import { useEffect, useMemo, useState } from "react";
import {
    ArrowDown,
    ArrowUp,
    ArrowUpDown,
    CalendarClock,
    CheckCircle,
    ChevronRight,
    Eye,
    MapPin,
    RefreshCw,
    Settings2,
    User,
    Users,
    XCircle,
} from "lucide-react";
import { AlertToast, Breadcrumb, Pagination, formatUTCDateTime } from "@repo/ui";
import type { Trainer, TrainerBookingItem } from "../../types";
import { BOOKING_STATUS_LABELS, BOOKING_TYPE_LABELS } from "../../types";

type Props = {
    trainers: Trainer[];
    isLoading: boolean;
    error: Error | null;
    canManage: boolean;
    selectedTrainer: Trainer | null;
    bookings: TrainerBookingItem[];
    bookingsLoading: boolean;
    bookingsError: Error | null;
    onRefresh: () => void;
    onRefreshBookings: () => void;
    onSelectTrainer: (trainer: Trainer) => void;
    onViewTrainer: (trainer: Trainer) => void;
};

const PAGE_SIZE = 10;
const UPCOMING_LIMIT = 10;

function initials(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "?";
    const first = parts[0]?.[0] ?? "";
    const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
    return (first + last).toUpperCase();
}

function TrainerAvatar({ name, size = "md" }: { name: string; size?: "sm" | "md" }): JSX.Element {
    const dim = size === "sm" ? "h-7 w-7 text-[10px]" : "h-9 w-9 text-xs";
    return (
        <div
            className={`flex ${dim} shrink-0 items-center justify-center rounded-full bg-secondary font-semibold text-secondary-foreground`}
            aria-hidden="true"
        >
            {initials(name)}
        </div>
    );
}

type SortKey = "name" | "status";
type SortDirection = "asc" | "desc";

function compareText(a: string, b: string): number {
    return a.localeCompare(b, undefined, { sensitivity: "base", numeric: true });
}

function StatusBadge({ isActive }: { isActive: boolean }): JSX.Element {
    return isActive ? (
        <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2.5 py-0.5 text-[11px] font-medium text-success">
            <CheckCircle size={10} />
            Active
        </span>
    ) : (
        <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2.5 py-0.5 text-[11px] font-medium text-destructive">
            <XCircle size={10} />
            Inactive
        </span>
    );
}

type SortButtonProps = {
    label: string;
    sortKey: SortKey;
    activeSortKey: SortKey | null;
    direction: SortDirection;
    onSort: (sortKey: SortKey) => void;
};

function SortButton({
    label,
    sortKey,
    activeSortKey,
    direction,
    onSort,
}: SortButtonProps): JSX.Element {
    const isActive = activeSortKey === sortKey;
    const Icon = isActive ? (direction === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;

    return (
        <button
            type="button"
            onClick={() => onSort(sortKey)}
            className={`inline-flex h-8 items-center gap-1 rounded-lg border px-2.5 text-xs font-medium transition ${
                isActive
                    ? "border-cta bg-cta/10 text-cta"
                    : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
            aria-label={`Sort by ${label} ${isActive && direction === "asc" ? "descending" : "ascending"}`}
        >
            <span>{label}</span>
            <Icon size={12} />
        </button>
    );
}

function filterUpcomingBookings(bookings: TrainerBookingItem[]): TrainerBookingItem[] {
    const now = Date.now();

    return bookings
        .filter((booking) => {
            const start = new Date(booking.start_datetime).getTime();
            return !Number.isNaN(start) && start >= now;
        })
        .sort((a, b) => new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime())
        .slice(0, UPCOMING_LIMIT);
}

function bookingStatusClasses(status: string): string {
    switch (status) {
        case "confirmed":
            return "bg-success/15 text-success";
        case "cancelled":
            return "bg-destructive/10 text-destructive";
        case "completed":
            return "bg-muted text-muted-foreground";
        default:
            return "bg-cta/10 text-cta";
    }
}

function TrainerBookingsPanel({
    trainer,
    bookings,
    bookingsLoading,
    bookingsError,
    onRefreshBookings,
    onViewTrainer,
}: {
    trainer: Trainer | null;
    bookings: TrainerBookingItem[];
    bookingsLoading: boolean;
    bookingsError: Error | null;
    onRefreshBookings: () => void;
    onViewTrainer: (trainer: Trainer) => void;
}): JSX.Element {
    const upcomingBookings = useMemo(() => filterUpcomingBookings(bookings), [bookings]);

    if (trainer == null) {
        return (
            <aside className="flex min-h-[34rem] items-center justify-center bg-muted/10 px-6 py-16 text-center">
                <div className="max-w-sm">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                        <User size={22} />
                    </div>
                    <h2 className="mt-4 text-sm font-semibold text-foreground">Select a trainer</h2>
                    <p className="mt-1.5 text-sm text-muted-foreground">
                        Choose a trainer from the list to view their upcoming bookings.
                    </p>
                </div>
            </aside>
        );
    }

    return (
        <aside className="flex h-full flex-col bg-background">
            {/* Trainer header */}
            <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-2 sm:px-5">
                <div className="flex min-w-0 items-center gap-2">
                    <TrainerAvatar name={trainer.full_name} size="sm" />
                    <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                            <h2 className="text-xs font-semibold text-foreground">
                                {trainer.full_name}
                            </h2>
                            <StatusBadge isActive={trainer.is_active} />
                        </div>
                        <p className="truncate text-[11px] leading-tight text-muted-foreground">
                            {trainer.bio ?? "No bio provided."}
                        </p>
                    </div>
                </div>
                <button
                    onClick={() => onViewTrainer(trainer)}
                    className="btn-outline min-h-7 shrink-0 gap-1 px-2 text-[11px]"
                    aria-label={`Open profile for ${trainer.full_name}`}
                >
                    <Settings2 size={11} />
                    Profile
                </button>
            </div>

            {/* Bookings header */}
            <div className="flex items-center justify-between border-b border-border px-4 py-1.5 sm:px-5">
                <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Upcoming bookings · next {UPCOMING_LIMIT}
                </h3>
                <button
                    onClick={onRefreshBookings}
                    className="rounded p-0.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                    aria-label="Refresh bookings"
                >
                    <RefreshCw size={11} />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto">
                {bookingsError ? (
                    <div className="px-3 py-2 sm:px-4">
                        <AlertToast
                            title={bookingsError.message ?? "Failed to load bookings."}
                            variant="error"
                            onClose={onRefreshBookings}
                        />
                    </div>
                ) : null}

                {bookingsLoading ? (
                    <div className="flex items-center gap-2 px-4 py-4">
                        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-border border-t-cta" />
                        <span className="text-[11px] text-muted-foreground">Loading…</span>
                    </div>
                ) : upcomingBookings.length === 0 ? (
                    <div className="flex items-center gap-1.5 px-4 py-6 text-[11px] text-muted-foreground">
                        <CalendarClock size={12} />
                        No upcoming bookings.
                    </div>
                ) : (
                    <table className="w-full text-left text-xs">
                        <thead>
                            <tr className="border-b border-border bg-muted/20 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                                <th className="px-4 py-2 font-medium">Date &amp; time</th>
                                <th className="px-3 py-2 font-medium">Court</th>
                                <th className="px-3 py-2 font-medium">Type</th>
                                <th className="px-3 py-2 text-right font-medium">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {upcomingBookings.map((booking) => (
                                <tr
                                    key={booking.booking_id}
                                    className="transition-colors hover:bg-muted/20"
                                >
                                    <td className="px-4 py-2.5 font-medium text-foreground tabular-nums">
                                        {formatUTCDateTime(booking.start_datetime)}
                                    </td>
                                    <td className="px-3 py-2.5 text-muted-foreground">
                                        <span className="flex min-w-0 items-center gap-1">
                                            <MapPin size={11} className="shrink-0" />
                                            <span className="truncate">{booking.court_name}</span>
                                        </span>
                                    </td>
                                    <td className="px-3 py-2.5 text-muted-foreground">
                                        {BOOKING_TYPE_LABELS[booking.booking_type] ??
                                            booking.booking_type}
                                    </td>
                                    <td className="px-3 py-2.5 text-right">
                                        <span
                                            className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${bookingStatusClasses(
                                                booking.status
                                            )}`}
                                        >
                                            {BOOKING_STATUS_LABELS[booking.status] ??
                                                booking.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </aside>
    );
}

export default function TrainersView({
    trainers,
    isLoading,
    error,
    canManage,
    selectedTrainer = null,
    bookings = [],
    bookingsLoading = false,
    bookingsError = null,
    onRefresh,
    onRefreshBookings = () => undefined,
    onSelectTrainer = () => undefined,
    onViewTrainer,
}: Props): JSX.Element {
    const [page, setPage] = useState(0);
    const [sortKey, setSortKey] = useState<SortKey | null>(null);
    const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
    const [search, setSearch] = useState("");

    const filteredTrainers = useMemo(() => {
        if (!search.trim()) return trainers;
        const q = search.trim().toLowerCase();
        return trainers.filter((t) => t.full_name.toLowerCase().includes(q));
    }, [trainers, search]);

    const sortedTrainers = useMemo(() => {
        if (sortKey == null) {
            return filteredTrainers;
        }

        const direction = sortDirection === "asc" ? 1 : -1;

        return [...filteredTrainers].sort((a, b) => {
            let result = 0;

            if (sortKey === "name") {
                result = compareText(a.full_name, b.full_name);
            } else {
                result = compareText(
                    a.is_active ? "Active" : "Inactive",
                    b.is_active ? "Active" : "Inactive"
                );
            }

            if (result === 0) {
                result = compareText(a.full_name, b.full_name);
            }

            return result * direction;
        });
    }, [sortDirection, sortKey, filteredTrainers]);

    const totalPages = Math.ceil(sortedTrainers.length / PAGE_SIZE);

    const pageTrainers = useMemo(
        () => sortedTrainers.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE),
        [page, sortedTrainers]
    );

    useEffect(() => {
        setPage(0);
        setSortKey(null);
        setSortDirection("asc");
    }, [trainers]);

    const handleSort = (nextSortKey: SortKey) => {
        if (nextSortKey === sortKey) {
            setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
        } else {
            setSortKey(nextSortKey);
            setSortDirection("asc");
        }
        setPage(0);
    };

    const handleRefreshClick = () => {
        setPage(0);
        setSortKey(null);
        setSortDirection("asc");
        setSearch("");
        onRefresh();
    };

    return (
        <div className="w-full space-y-5">
            <Breadcrumb items={[{ label: "Trainers" }]} />

            <section className="card-surface overflow-hidden">
                <header className="border-b border-border bg-muted/10 px-5 py-4 sm:px-6">
                    <div className="flex items-center gap-2.5">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-secondary text-secondary-foreground shadow-xs">
                            <Users size={16} />
                        </div>
                        <div className="flex min-w-0 flex-1 items-center gap-2">
                            <h1 className="text-lg font-semibold tracking-tight text-foreground">
                                Trainers
                            </h1>
                            {trainers.length > 0 ? (
                                <span className="rounded-full border border-border bg-background px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground shadow-xs">
                                    {trainers.length} total
                                </span>
                            ) : null}
                        </div>
                        <button
                            onClick={handleRefreshClick}
                            className="btn-outline shrink-0 min-h-10 px-4"
                            aria-label="Refresh trainers"
                        >
                            <RefreshCw size={14} /> Refresh
                        </button>
                    </div>
                    <p className="mt-1 pl-[2.875rem] text-sm text-muted-foreground">
                        View trainer profiles and weekly availability.
                    </p>
                </header>

                {error ? (
                    <div className="px-5 py-5 sm:px-6">
                        <AlertToast
                            title={error.message ?? "Failed to load trainers."}
                            variant="error"
                            onClose={onRefresh}
                        />
                    </div>
                ) : null}

                {isLoading ? (
                    <div className="flex items-center justify-center gap-3 py-16">
                        <span className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-cta" />
                        <span className="text-sm text-muted-foreground">Loading trainers…</span>
                    </div>
                ) : !error && trainers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                            <Users size={22} />
                        </div>
                        <p className="text-sm font-medium text-foreground">No trainers found</p>
                        <p className="text-sm text-muted-foreground">
                            {canManage
                                ? "Trainers are added via staff management."
                                : "No trainers are currently assigned to this club."}
                        </p>
                    </div>
                ) : !error ? (
                    <>
                        <div className="grid min-w-0 xl:grid-cols-[minmax(280px,340px)_minmax(560px,1fr)]">
                            <div className="min-w-0 border-b border-border xl:border-b-0 xl:border-r xl:border-border">
                                <div className="space-y-2.5 border-b border-border px-4 py-3 sm:px-5">
                                    <div className="flex items-center justify-between gap-2">
                                        <h2 className="text-sm font-semibold text-foreground">
                                            Trainer list
                                        </h2>
                                        <SortButton
                                            label="Sort"
                                            sortKey="name"
                                            activeSortKey={sortKey}
                                            direction={sortDirection}
                                            onSort={handleSort}
                                        />
                                    </div>
                                    <input
                                        type="search"
                                        value={search}
                                        onChange={(e) => {
                                            setSearch(e.target.value);
                                            setPage(0);
                                        }}
                                        placeholder="Search trainers…"
                                        className="h-9 w-full rounded-lg border border-border bg-card px-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-cta"
                                    />
                                </div>

                                <div className="space-y-1 p-2 sm:p-3">
                                    {pageTrainers.map((trainer) => {
                                        const isSelected = selectedTrainer?.id === trainer.id;

                                        return (
                                            <div
                                                key={trainer.id}
                                                role="button"
                                                tabIndex={0}
                                                aria-label={`Select trainer ${trainer.full_name}`}
                                                onClick={() => onSelectTrainer(trainer)}
                                                onKeyDown={(event) => {
                                                    if (
                                                        event.key === "Enter" ||
                                                        event.key === " "
                                                    ) {
                                                        event.preventDefault();
                                                        onSelectTrainer(trainer);
                                                    }
                                                }}
                                                className={`group flex cursor-pointer items-center gap-2.5 rounded-lg border px-2.5 py-2 transition-colors ${
                                                    isSelected
                                                        ? "border-cta bg-cta/5 ring-1 ring-cta/30"
                                                        : "border-transparent hover:border-border hover:bg-muted/40"
                                                }`}
                                            >
                                                <TrainerAvatar name={trainer.full_name} size="sm" />
                                                <div className="flex min-w-0 flex-1 items-center gap-2">
                                                    <span
                                                        className={`truncate text-sm font-medium ${isSelected ? "text-cta" : "text-foreground"}`}
                                                    >
                                                        {trainer.full_name}
                                                    </span>
                                                    <span
                                                        className={`h-1.5 w-1.5 shrink-0 rounded-full ${trainer.is_active ? "bg-success" : "bg-destructive"}`}
                                                        title={
                                                            trainer.is_active
                                                                ? "Active"
                                                                : "Inactive"
                                                        }
                                                        aria-label={
                                                            trainer.is_active
                                                                ? "Active"
                                                                : "Inactive"
                                                        }
                                                    />
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={(event) => {
                                                        event.stopPropagation();
                                                        onViewTrainer(trainer);
                                                    }}
                                                    className="shrink-0 rounded-md p-1 text-muted-foreground transition hover:bg-muted hover:text-cta"
                                                    aria-label={`View profile for ${trainer.full_name}`}
                                                >
                                                    <Eye size={15} />
                                                </button>
                                                <ChevronRight
                                                    size={15}
                                                    className={`shrink-0 transition ${isSelected ? "text-cta" : "text-muted-foreground/40"}`}
                                                />
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            <TrainerBookingsPanel
                                trainer={selectedTrainer}
                                bookings={bookings}
                                bookingsLoading={bookingsLoading}
                                bookingsError={bookingsError}
                                onRefreshBookings={onRefreshBookings}
                                onViewTrainer={onViewTrainer}
                            />
                        </div>

                        <Pagination
                            page={page}
                            totalPages={totalPages}
                            totalItems={sortedTrainers.length}
                            pageSize={PAGE_SIZE}
                            onPageChange={setPage}
                        />
                    </>
                ) : null}
            </section>
        </div>
    );
}
