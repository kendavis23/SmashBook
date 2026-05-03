import type { JSX } from "react";
import { useEffect, useMemo, useState } from "react";
import {
    ArrowDown,
    ArrowUp,
    ArrowUpDown,
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
import { formatTime } from "../../utils";

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
        [...slots].sort((a, b) => compareText(a.effective_from, b.effective_from))
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
    const groupedAvailability = useMemo(() => groupAvailabilityByDay(availability), [availability]);

    if (trainer == null) {
        return (
            <aside className="flex min-h-[34rem] items-center justify-center bg-muted/10 px-6 py-16 text-center">
                <div className="max-w-sm">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                        <User size={22} />
                    </div>
                    <h2 className="mt-4 text-sm font-semibold text-foreground">Select a trainer</h2>
                    <p className="mt-1.5 text-sm text-muted-foreground">
                        Choose a trainer from the list to view their profile and weekly
                        availability.
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
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                        <User size={13} />
                    </div>
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

            {/* Availability header */}
            <div className="flex items-center justify-between border-b border-border px-4 py-1.5 sm:px-5">
                <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Availability
                </h3>
                <button
                    onClick={onRefreshAvailability}
                    className="rounded p-0.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                    aria-label="Refresh availability"
                >
                    <RefreshCw size={11} />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto px-3 py-2 sm:px-4">
                {availabilityError ? (
                    <AlertToast
                        title={availabilityError.message ?? "Failed to load availability."}
                        variant="error"
                        onClose={onRefreshAvailability}
                    />
                ) : null}

                {availabilityLoading ? (
                    <div className="flex items-center gap-2 py-4">
                        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-border border-t-cta" />
                        <span className="text-[11px] text-muted-foreground">Loading…</span>
                    </div>
                ) : availability.length === 0 ? (
                    <div className="flex items-center gap-1.5 py-4 text-[11px] text-muted-foreground">
                        <Clock size={12} />
                        No availability configured.
                    </div>
                ) : (
                    <div className="space-y-1.5">
                        {groupedAvailability.map((slots, dayIndex) => {
                            if (slots.length === 0) return null;
                            return (
                                <div
                                    key={dayIndex}
                                    className="overflow-hidden rounded-lg border border-border"
                                >
                                    {/* Day header */}
                                    <div className="flex items-center justify-between border-b border-border bg-muted/20 px-2.5 py-1.5">
                                        <span className="text-xs text-foreground bg-muted/80">
                                            {DAY_LABELS[dayIndex]}
                                        </span>
                                        <span className="text-[11px] text-muted-foreground">
                                            {slots.length} {slots.length === 1 ? "slot" : "slots"}
                                        </span>
                                    </div>
                                    {/* Slot rows */}
                                    <div className="divide-y divide-border/50">
                                        {slots.map((slot) => (
                                            <div
                                                key={slot.id}
                                                className="flex items-center justify-between gap-2 px-2.5 py-1.5"
                                            >
                                                <div className="flex min-w-0 items-center gap-2">
                                                    <span className="text-[11px] font-medium text-foreground tabular-nums">
                                                        {formatTime(slot.start_time)} -{" "}
                                                        {formatTime(slot.end_time)}
                                                    </span>
                                                    {slot.notes ? (
                                                        <span className="truncate text-[10px] text-muted-foreground">
                                                            {slot.notes}
                                                        </span>
                                                    ) : null}
                                                </div>
                                                <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
                                                    {formatUTCDate(slot.effective_from)}
                                                    {slot.effective_until
                                                        ? ` – ${formatUTCDate(slot.effective_until)}`
                                                        : null}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
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
                        <div className="grid min-w-0 xl:grid-cols-[minmax(0,0.95fr)_minmax(500px,1.05fr)]">
                            <div className="min-w-0 border-b border-border xl:border-b-0 xl:border-r xl:border-border">
                                <div className="flex flex-col gap-3 border-b border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                                    <div>
                                        <h2 className="text-sm font-semibold text-foreground">
                                            Trainer list
                                        </h2>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <input
                                            type="search"
                                            value={search}
                                            onChange={(e) => {
                                                setSearch(e.target.value);
                                                setPage(0);
                                            }}
                                            placeholder="Search trainers…"
                                            className="h-8 rounded-lg border border-border bg-card px-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-cta"
                                        />
                                        <SortButton
                                            label="Trainer"
                                            sortKey="name"
                                            activeSortKey={sortKey}
                                            direction={sortDirection}
                                            onSort={handleSort}
                                        />
                                    </div>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-border bg-muted/20 text-left text-xs font-medium text-muted-foreground">
                                                <th className="px-4 py-2 sm:px-6">Name</th>
                                                <th className="px-2 py-2">Status</th>
                                                <th className="px-2 py-2 text-right">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border">
                                            {pageTrainers.map((trainer) => {
                                                const isSelected =
                                                    selectedTrainer?.id === trainer.id;

                                                return (
                                                    <tr
                                                        key={trainer.id}
                                                        role="button"
                                                        tabIndex={0}
                                                        aria-label={`Select trainer ${trainer.full_name}`}
                                                        className={`cursor-pointer transition-colors ${
                                                            isSelected
                                                                ? "bg-cta/5"
                                                                : "hover:bg-muted/30"
                                                        }`}
                                                        onClick={() => onSelectTrainer(trainer)}
                                                    >
                                                        <td className="px-4 py-2.5 sm:px-6">
                                                            <div className="flex items-center gap-2">
                                                                <div className="min-w-0">
                                                                    <span
                                                                        className={`block truncate font-medium ${isSelected ? "text-cta" : "text-foreground"}`}
                                                                    >
                                                                        {trainer.full_name}
                                                                    </span>
                                                                    {trainer.bio ? (
                                                                        <span className="block truncate text-xs text-muted-foreground">
                                                                            {trainer.bio}
                                                                        </span>
                                                                    ) : (
                                                                        <span className="block truncate text-xs text-muted-foreground">
                                                                            No bio provided
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-2 py-2.5">
                                                            <StatusBadge
                                                                isActive={trainer.is_active}
                                                            />
                                                        </td>
                                                        <td className="px-2 py-2.5 text-right">
                                                            <button
                                                                type="button"
                                                                onClick={(event) => {
                                                                    event.stopPropagation();
                                                                    onViewTrainer(trainer);
                                                                }}
                                                                className="inline-flex items-center justify-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs text-foreground transition hover:bg-muted"
                                                            >
                                                                <Settings2 size={13} />
                                                                View
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
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
