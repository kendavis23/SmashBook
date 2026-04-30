import type { JSX } from "react";
import { useEffect, useMemo, useState } from "react";
import {
    ArrowDown,
    ArrowUp,
    ArrowUpDown,
    CalendarDays,
    CheckCircle,
    ChevronLeft,
    ChevronRight,
    Clock,
    RefreshCw,
    Settings2,
    User,
    Users,
    XCircle,
} from "lucide-react";
import { AlertToast, Breadcrumb, formatUTCDate } from "@repo/ui";
import type { Trainer, TrainerAvailability } from "../../types";
import { DAY_LABELS } from "../../types";

type Props = {
    trainers: Trainer[];
    isLoading: boolean;
    error: Error | null;
    canManage: boolean;
    selectedTrainer: Trainer | null;
    availability: TrainerAvailability[];
    availabilityLoading: boolean;
    availabilityError: Error | null;
    onRefresh: () => void;
    onRefreshAvailability: () => void;
    onSelectTrainer: (trainer: Trainer) => void;
    onViewTrainer: (trainer: Trainer) => void;
};

const PAGE_SIZE = 10;

type SortKey = "name" | "status";
type SortDirection = "asc" | "desc";

function compareText(a: string, b: string): number {
    return a.localeCompare(b, undefined, { sensitivity: "base", numeric: true });
}

function formatTime(time: string): string {
    const [hourPart = "0", minutePart = "0"] = time.split(":");
    const hour = Number(hourPart);
    const minute = Number(minutePart);

    if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
        return time;
    }

    const period = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 === 0 ? 12 : hour % 12;

    return `${displayHour}:${String(minute).padStart(2, "0")} ${period}`;
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

function groupAvailabilityByDay(availability: TrainerAvailability[]): TrainerAvailability[][] {
    const grouped = Array.from({ length: 7 }, () => [] as TrainerAvailability[]);

    availability.forEach((slot) => {
        if (slot.day_of_week >= 0 && slot.day_of_week <= 6) {
            grouped[slot.day_of_week]?.push(slot);
        }
    });

    return grouped.map((slots) =>
        [...slots].sort((a, b) => compareText(a.start_time, b.start_time))
    );
}

function TrainerProfilePanel({
    trainer,
    availability,
    availabilityLoading,
    availabilityError,
    onRefreshAvailability,
    onViewTrainer,
}: {
    trainer: Trainer | null;
    availability: TrainerAvailability[];
    availabilityLoading: boolean;
    availabilityError: Error | null;
    onRefreshAvailability: () => void;
    onViewTrainer: (trainer: Trainer) => void;
}): JSX.Element {
    const groupedAvailability = useMemo(
        () => groupAvailabilityByDay(availability),
        [availability]
    );
    const availabilityCount = availability.length;

    if (trainer == null) {
        return (
            <aside className="flex min-h-[34rem] items-center justify-center bg-muted/10 px-6 py-16 text-center">
                <div className="max-w-sm">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                        <User size={22} />
                    </div>
                    <h2 className="mt-4 text-sm font-semibold text-foreground">
                        Select a trainer
                    </h2>
                    <p className="mt-1.5 text-sm text-muted-foreground">
                        Choose a trainer from the list to view their profile and weekly
                        availability.
                    </p>
                </div>
            </aside>
        );
    }

    return (
        <aside className="flex h-full min-h-[34rem] flex-col bg-background">
            <div className="border-b border-border px-5 py-5 sm:px-6">
                <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                        <div className="flex items-center gap-3">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
                                <User size={20} />
                            </div>
                            <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                    <h2 className="truncate text-lg font-semibold tracking-tight text-foreground">
                                        {trainer.full_name}
                                    </h2>
                                    <StatusBadge isActive={trainer.is_active} />
                                </div>
                                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                                    {trainer.bio ?? "No bio provided."}
                                </p>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={() => onViewTrainer(trainer)}
                        className="btn-outline min-h-9 shrink-0 px-3 text-xs"
                        aria-label={`Open profile for ${trainer.full_name}`}
                    >
                        <Settings2 size={13} />
                        Profile
                    </button>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3">
                    <div className="rounded-lg border border-border bg-muted/20 px-3 py-2.5">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                            Status
                        </p>
                        <p className="mt-1 text-sm font-semibold text-foreground">
                            {trainer.is_active ? "Taking bookings" : "Inactive"}
                        </p>
                    </div>
                    <div className="rounded-lg border border-border bg-muted/20 px-3 py-2.5">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                            Weekly slots
                        </p>
                        <p className="mt-1 text-sm font-semibold text-foreground">
                            {availabilityCount} {availabilityCount === 1 ? "slot" : "slots"}
                        </p>
                    </div>
                </div>
            </div>

            <div className="flex items-center justify-between gap-3 border-b border-border bg-muted/20 px-5 py-3 sm:px-6">
                <div>
                    <h3 className="text-sm font-semibold text-foreground">Availability</h3>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                        Weekly schedule grouped by day.
                    </p>
                </div>
                <button
                    onClick={onRefreshAvailability}
                    className="rounded-lg p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                    aria-label="Refresh availability"
                >
                    <RefreshCw size={14} />
                </button>
            </div>

            <div className="max-h-[42rem] flex-1 overflow-y-auto px-5 py-5 sm:px-6">
                {availabilityError ? (
                    <AlertToast
                        title={availabilityError.message ?? "Failed to load availability."}
                        variant="error"
                        onClose={onRefreshAvailability}
                    />
                ) : null}

                {availabilityLoading ? (
                    <div className="flex items-center justify-center gap-3 py-16">
                        <span className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-cta" />
                        <span className="text-sm text-muted-foreground">
                            Loading availability…
                        </span>
                    </div>
                ) : availability.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                            <Clock size={20} />
                        </div>
                        <p className="text-sm font-medium text-foreground">
                            No availability set
                        </p>
                        <p className="max-w-xs text-sm text-muted-foreground">
                            This trainer does not have weekly availability configured yet.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {groupedAvailability.map((slots, dayIndex) => (
                            <section
                                key={dayIndex}
                                className="rounded-lg border border-border bg-card"
                            >
                                <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
                                    <div className="flex items-center gap-2">
                                        <CalendarDays size={14} className="text-muted-foreground" />
                                        <h4 className="text-sm font-semibold text-foreground">
                                            {DAY_LABELS[dayIndex]}
                                        </h4>
                                    </div>
                                    <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                                        {slots.length} {slots.length === 1 ? "slot" : "slots"}
                                    </span>
                                </div>
                                {slots.length === 0 ? (
                                    <div className="px-4 py-3 text-xs text-muted-foreground">
                                        No time added
                                    </div>
                                ) : (
                                    <div className="divide-y divide-border">
                                        {slots.map((slot) => (
                                            <div key={slot.id} className="px-4 py-3">
                                                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <span className="h-4 w-0.5 rounded-full bg-cta" />
                                                        <span className="text-sm font-semibold text-foreground">
                                                            {formatTime(slot.start_time)} -{" "}
                                                            {formatTime(slot.end_time)}
                                                        </span>
                                                    </div>
                                                    <div className="text-xs text-muted-foreground sm:text-right">
                                                        <p>
                                                            From{" "}
                                                            {formatUTCDate(slot.effective_from)}
                                                        </p>
                                                        {slot.effective_until ? (
                                                            <p>
                                                                Until{" "}
                                                                {formatUTCDate(
                                                                    slot.effective_until
                                                                )}
                                                            </p>
                                                        ) : null}
                                                    </div>
                                                </div>
                                                {slot.notes ? (
                                                    <p className="mt-2 text-xs text-muted-foreground">
                                                        {slot.notes}
                                                    </p>
                                                ) : null}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </section>
                        ))}
                    </div>
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
    availability = [],
    availabilityLoading = false,
    availabilityError = null,
    onRefresh,
    onRefreshAvailability = () => undefined,
    onSelectTrainer = () => undefined,
    onViewTrainer,
}: Props): JSX.Element {
    const [page, setPage] = useState(0);
    const [sortKey, setSortKey] = useState<SortKey | null>(null);
    const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

    const sortedTrainers = useMemo(() => {
        if (sortKey == null) {
            return trainers;
        }

        const direction = sortDirection === "asc" ? 1 : -1;

        return [...trainers].sort((a, b) => {
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
    }, [sortDirection, sortKey, trainers]);

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
        onRefresh();
    };

    return (
        <div className="w-full space-y-5">
            <Breadcrumb items={[{ label: "Trainers" }]} />

            <section className="card-surface overflow-hidden">
                <header className="flex flex-col gap-3 border-b border-border bg-muted/10 px-5 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2.5">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary text-secondary-foreground shadow-xs">
                                <Users size={16} />
                            </div>
                            <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                    <h1 className="text-lg font-semibold tracking-tight text-foreground">
                                        Trainers
                                    </h1>
                                    {trainers.length > 0 ? (
                                        <span className="rounded-full border border-border bg-background px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground shadow-xs">
                                            {trainers.length} total
                                        </span>
                                    ) : null}
                                </div>
                                <p className="mt-0.5 text-sm text-muted-foreground">
                                    View trainer profiles and weekly availability.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                        <button
                            onClick={handleRefreshClick}
                            className="btn-outline min-h-10 px-4"
                            aria-label="Refresh trainers"
                        >
                            <RefreshCw size={14} /> Refresh
                        </button>
                    </div>
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
                        <div className="grid min-w-0 xl:grid-cols-[minmax(0,0.95fr)_minmax(500px,1.05fr)]">
                            <div className="min-w-0 border-b border-border xl:border-b-0 xl:border-r xl:border-border">
                                <div className="flex flex-col gap-3 border-b border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                                    <div>
                                        <h2 className="text-sm font-semibold text-foreground">
                                            Trainer list
                                        </h2>
                                        <p className="mt-0.5 text-xs text-muted-foreground">
                                            Select a trainer to inspect profile and schedule.
                                        </p>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <SortButton
                                            label="Trainer"
                                            sortKey="name"
                                            activeSortKey={sortKey}
                                            direction={sortDirection}
                                            onSort={handleSort}
                                        />
                                        <SortButton
                                            label="Status"
                                            sortKey="status"
                                            activeSortKey={sortKey}
                                            direction={sortDirection}
                                            onSort={handleSort}
                                        />
                                    </div>
                                </div>

                                <div className="max-h-[42rem] overflow-y-auto px-4 py-4 sm:px-6">
                                    <div className="grid gap-3">
                                        {pageTrainers.map((trainer) => {
                                            const isSelected = selectedTrainer?.id === trainer.id;

                                            return (
                                                <article
                                                    key={trainer.id}
                                                    className={`rounded-xl border p-4 shadow-xs transition-colors ${
                                                        isSelected
                                                            ? "border-cta bg-cta/5"
                                                            : "border-border bg-background hover:bg-muted/30"
                                                    }`}
                                                >
                                                    <button
                                                        type="button"
                                                        onClick={() => onSelectTrainer(trainer)}
                                                        className="block w-full text-left"
                                                        aria-label={`Select trainer ${trainer.full_name}`}
                                                    >
                                                        <div className="flex items-start justify-between gap-4">
                                                            <div className="flex min-w-0 items-start gap-3">
                                                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
                                                                    <User size={16} />
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <div className="flex flex-wrap items-center gap-2">
                                                                        <h3 className="truncate text-sm font-semibold text-foreground sm:text-base">
                                                                            {trainer.full_name}
                                                                        </h3>
                                                                        <StatusBadge
                                                                            isActive={
                                                                                trainer.is_active
                                                                            }
                                                                        />
                                                                    </div>
                                                                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                                                                        {trainer.bio ??
                                                                            "No bio provided"}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            {isSelected ? (
                                                                <span className="shrink-0 rounded-full bg-cta px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-cta-foreground">
                                                                    Selected
                                                                </span>
                                                            ) : null}
                                                        </div>
                                                    </button>
                                                    <div className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-3">
                                                        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                                                            <Clock size={13} />
                                                            Select to view availability
                                                        </span>
                                                        <button
                                                            onClick={() => onViewTrainer(trainer)}
                                                            className="inline-flex items-center justify-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs text-foreground transition hover:bg-muted"
                                                        >
                                                            <Settings2 size={13} /> View
                                                        </button>
                                                    </div>
                                                </article>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            <TrainerProfilePanel
                                trainer={selectedTrainer}
                                availability={availability}
                                availabilityLoading={availabilityLoading}
                                availabilityError={availabilityError}
                                onRefreshAvailability={onRefreshAvailability}
                                onViewTrainer={onViewTrainer}
                            />
                        </div>

                        {totalPages > 1 ? (
                            <div className="flex items-center justify-between border-t border-border px-5 py-3 sm:px-6">
                                <span className="text-xs text-muted-foreground">
                                    {page * PAGE_SIZE + 1}-
                                    {Math.min((page + 1) * PAGE_SIZE, sortedTrainers.length)} of{" "}
                                    {sortedTrainers.length}
                                </span>
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => setPage((p) => p - 1)}
                                        disabled={page === 0}
                                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-foreground transition hover:bg-muted disabled:pointer-events-none disabled:opacity-40"
                                        aria-label="Previous page"
                                    >
                                        <ChevronLeft size={14} />
                                    </button>
                                    {Array.from({ length: totalPages }, (_, i) => (
                                        <button
                                            key={i}
                                            onClick={() => setPage(i)}
                                            className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border text-xs font-medium transition ${
                                                i === page
                                                    ? "border-cta bg-cta text-cta-foreground"
                                                    : "border-border bg-card text-foreground hover:bg-muted"
                                            }`}
                                            aria-label={`Page ${i + 1}`}
                                            aria-current={i === page ? "page" : undefined}
                                        >
                                            {i + 1}
                                        </button>
                                    ))}
                                    <button
                                        onClick={() => setPage((p) => p + 1)}
                                        disabled={page === totalPages - 1}
                                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-foreground transition hover:bg-muted disabled:pointer-events-none disabled:opacity-40"
                                        aria-label="Next page"
                                    >
                                        <ChevronRight size={14} />
                                    </button>
                                </div>
                            </div>
                        ) : null}
                    </>
                ) : null}
            </section>
        </div>
    );
}
