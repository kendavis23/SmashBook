import type { CalendarReservation, Court, ReservationFilters } from "../../types";
import {
    RESERVATION_TYPE_LABELS,
    RESERVATION_TYPE_COLORS,
    RESERVATION_TYPE_OPTIONS,
} from "../../types";
import {
    Breadcrumb,
    DateTimePicker,
    formatUTCDateTime,
    formatUTCDate,
    SelectInput,
} from "@repo/ui";
import {
    CalendarX2,
    ChevronLeft,
    ChevronRight,
    Plus,
    RefreshCw,
    Search,
    Settings2,
    Repeat,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { JSX } from "react";

type Props = {
    reservations: CalendarReservation[];
    isLoading: boolean;
    error: Error | null;
    canCreate: boolean;
    filters: ReservationFilters;
    courts: Court[];
    courtNameMap: Record<string, string>;
    onFiltersChange: (filters: ReservationFilters) => void;
    onSearch: () => void;
    onCreateClick: () => void;
    onManageClick: (reservationId: string) => void;
    onRefresh: () => void;
};

const PAGE_SIZE = 10;

const thCls =
    "px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap";
const tdCls = "px-3 py-3 text-sm text-foreground align-top";

export default function ReservationsView({
    reservations,
    isLoading,
    error,
    canCreate,
    filters,
    courts,
    courtNameMap,
    onFiltersChange,
    onSearch,
    onCreateClick,
    onManageClick,
    onRefresh,
}: Props): JSX.Element {
    const [page, setPage] = useState(0);

    const totalPages = Math.ceil(reservations.length / PAGE_SIZE);

    const pageReservations = useMemo(
        () => reservations.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE),
        [reservations, page]
    );

    // Reset to first page when reservation list changes (new search)
    useEffect(() => {
        setPage(0);
    }, [reservations]);

    return (
        <div className="w-full space-y-5">
            <Breadcrumb items={[{ label: "Reservations" }]} />

            <section className="card-surface overflow-hidden">
                {/* Header */}
                <header className="flex flex-col gap-3 border-b border-border bg-muted/10 px-5 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2.5">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary text-secondary-foreground shadow-xs">
                                <CalendarX2 size={16} />
                            </div>
                            <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                    <h1 className="text-lg font-semibold tracking-tight text-foreground">
                                        Reservations
                                    </h1>
                                    {reservations.length > 0 ? (
                                        <span className="rounded-full border border-border bg-background px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground shadow-xs">
                                            {reservations.length} total
                                        </span>
                                    ) : null}
                                </div>
                                <p className="mt-0.5 text-sm text-muted-foreground">
                                    Manage calendar reservations for courts
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                        <button
                            onClick={onRefresh}
                            className="btn-outline min-h-10 px-4"
                            aria-label="Refresh reservations"
                        >
                            <RefreshCw size={14} /> Refresh
                        </button>
                        {canCreate ? (
                            <button onClick={onCreateClick} className="btn-cta min-h-10 px-4">
                                <Plus size={14} /> Add Reservation
                            </button>
                        ) : null}
                    </div>
                </header>

                {/* Filters */}
                <div className="border-b border-border bg-muted/20 px-5 py-4 sm:px-6">
                    <div className="mb-3 flex items-center gap-2">
                        <Search size={13} className="text-muted-foreground" />
                        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Filters
                        </span>
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1fr_auto]">
                        {/* Type */}
                        <div className="flex flex-col gap-1">
                            <span className="text-[11px] font-medium text-muted-foreground">
                                Type
                            </span>
                            <SelectInput
                                value={filters.reservationType}
                                onValueChange={(v) =>
                                    onFiltersChange({
                                        ...filters,
                                        reservationType: v,
                                    })
                                }
                                options={RESERVATION_TYPE_OPTIONS.filter((o) => o.value !== "")}
                                clearLabel="All types"
                                aria-label="Filter by reservation type"
                            />
                        </div>

                        {/* Court */}
                        <div className="flex flex-col gap-1">
                            <span className="text-[11px] font-medium text-muted-foreground">
                                Court
                            </span>
                            <SelectInput
                                value={filters.courtId}
                                onValueChange={(v) => onFiltersChange({ ...filters, courtId: v })}
                                options={courts.map((court) => ({
                                    value: court.id,
                                    label: court.name,
                                }))}
                                clearLabel="All courts"
                                aria-label="Filter by court"
                            />
                        </div>

                        {/* From */}
                        <div className="flex flex-col gap-1">
                            <span className="text-[11px] font-medium text-muted-foreground">
                                From
                            </span>
                            <DateTimePicker
                                value={filters.fromDt}
                                onChange={(v) => onFiltersChange({ ...filters, fromDt: v })}
                            />
                        </div>

                        {/* To */}
                        <div className="flex flex-col gap-1">
                            <span className="text-[11px] font-medium text-muted-foreground">
                                To
                            </span>
                            <DateTimePicker
                                value={filters.toDt}
                                onChange={(v) => onFiltersChange({ ...filters, toDt: v })}
                            />
                        </div>

                        {/* Search button aligned to bottom */}
                        <div className="flex flex-col justify-end">
                            <button
                                onClick={onSearch}
                                className="btn-cta h-[38px] w-full whitespace-nowrap px-5 lg:w-auto"
                                aria-label="Apply filters"
                            >
                                <Search size={14} /> Search
                            </button>
                        </div>
                    </div>
                </div>

                {/* Content */}
                {isLoading ? (
                    <div className="flex items-center justify-center gap-3 py-20">
                        <span className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-cta" />
                        <span className="text-sm text-muted-foreground">Loading reservations…</span>
                    </div>
                ) : error ? (
                    <div className="m-5 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                        {error.message}
                    </div>
                ) : reservations.length === 0 ? (
                    <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
                        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                            <CalendarX2 size={24} className="text-muted-foreground/40" />
                        </div>
                        <h3 className="text-sm font-semibold text-foreground">No reservations</h3>
                        <p className="mt-1.5 max-w-xs text-xs text-muted-foreground">
                            No reservations match your filters. Try adjusting your search or add a
                            new reservation.
                        </p>
                        {canCreate ? (
                            <button onClick={onCreateClick} className="btn-cta mt-5">
                                <Plus size={14} /> Add Reservation
                            </button>
                        ) : null}
                    </div>
                ) : (
                    <div className="overflow-x-auto" key={page}>
                        <table className="w-full min-w-[900px] border-collapse">
                            <thead>
                                <tr className="border-b border-border bg-muted/30">
                                    <th className={thCls}>Title</th>
                                    <th className={thCls}>Court</th>
                                    <th className={thCls}>Type</th>
                                    <th className={thCls}>Start</th>
                                    <th className={thCls}>End</th>
                                    <th className={thCls}>Booking Types</th>
                                    <th className={thCls}>Recurring</th>
                                    <th className={`${thCls} text-right`}>Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {pageReservations.map((res) => {
                                    const colors =
                                        RESERVATION_TYPE_COLORS[res.reservation_type] ??
                                        RESERVATION_TYPE_COLORS["private_hire"]!;

                                    const courtLabel = res.court_id
                                        ? (courtNameMap[res.court_id] ?? res.court_id)
                                        : "All courts";

                                    const bookingTypes = res.allowed_booking_types?.length
                                        ? res.allowed_booking_types.join(", ")
                                        : "—";

                                    return (
                                        <tr key={res.id} className="transition hover:bg-muted/20">
                                            {/* Title */}
                                            <td className={tdCls}>
                                                <span className="font-medium text-foreground">
                                                    {res.title}
                                                </span>
                                            </td>

                                            {/* Court */}
                                            <td className={tdCls}>
                                                <span className="text-muted-foreground">
                                                    {courtLabel}
                                                </span>
                                            </td>

                                            {/* Type badge */}
                                            <td className={tdCls}>
                                                <span
                                                    className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${colors.bg} ${colors.text}`}
                                                >
                                                    {RESERVATION_TYPE_LABELS[
                                                        res.reservation_type
                                                    ] ?? res.reservation_type}
                                                </span>
                                            </td>

                                            {/* Start datetime */}
                                            <td className={tdCls}>
                                                <span className="whitespace-nowrap text-muted-foreground">
                                                    {formatUTCDateTime(res.start_datetime)}
                                                </span>
                                            </td>

                                            {/* End datetime */}
                                            <td className={tdCls}>
                                                <span className="whitespace-nowrap text-muted-foreground">
                                                    {formatUTCDateTime(res.end_datetime)}
                                                </span>
                                            </td>

                                            {/* Allowed booking types */}
                                            <td className={`${tdCls} max-w-[160px]`}>
                                                <span className="break-words text-xs text-muted-foreground">
                                                    {bookingTypes}
                                                </span>
                                            </td>

                                            {/* Recurring */}
                                            <td className={tdCls}>
                                                {res.is_recurring ? (
                                                    <div className="flex flex-col gap-0.5">
                                                        <span className="flex items-center gap-1 text-xs font-medium text-foreground">
                                                            <Repeat size={11} /> Yes
                                                        </span>
                                                        {res.recurrence_end_date ? (
                                                            <span className="text-xs text-muted-foreground">
                                                                Until{" "}
                                                                {formatUTCDate(
                                                                    res.recurrence_end_date
                                                                )}
                                                            </span>
                                                        ) : null}
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground">
                                                        No
                                                    </span>
                                                )}
                                            </td>

                                            {/* Actions */}
                                            <td className={`${tdCls} text-right`}>
                                                <button
                                                    onClick={() => onManageClick(res.id)}
                                                    className="inline-flex items-center justify-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs text-foreground transition hover:bg-muted"
                                                    aria-label={`Manage ${res.title}`}
                                                >
                                                    <Settings2 size={13} /> Manage
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination */}
                {!isLoading && !error && totalPages > 1 ? (
                    <div className="flex items-center justify-between border-t border-border px-5 py-3 sm:px-6">
                        <span className="text-xs text-muted-foreground">
                            {page * PAGE_SIZE + 1}–
                            {Math.min((page + 1) * PAGE_SIZE, reservations.length)} of{" "}
                            {reservations.length}
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
            </section>
        </div>
    );
}
