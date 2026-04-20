import type { JSX } from "react";
import { useEffect, useMemo, useState } from "react";
import { Breadcrumb, DatePicker, formatCurrency, formatUTCDateTime, SelectInput } from "@repo/ui";
import {
    CalendarDays,
    ChevronLeft,
    ChevronRight,
    Plus,
    RefreshCw,
    Search,
    Settings2,
    User,
} from "lucide-react";
import type { Booking, BookingsListFilters } from "../../types";
import {
    BOOKING_STATUS_COLORS,
    BOOKING_STATUS_LABELS,
    BOOKING_STATUS_OPTIONS,
    BOOKING_TYPE_LABELS,
    BOOKING_TYPE_OPTIONS,
} from "../../types";

type Props = {
    bookings: Booking[];
    isLoading: boolean;
    error: Error | null;
    canManage: boolean;
    filters: BookingsListFilters;
    courts: { id: string; name: string }[];
    courtNameMap: Record<string, string>;
    onFiltersChange: (filters: BookingsListFilters) => void;
    onSearch: () => void;
    onRefresh: () => void;
    onCreateClick: () => void;
    onManageClick: (bookingId: string) => void;
};

const PAGE_SIZE = 10;

const thCls =
    "px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap";
const tdCls = "px-3 py-3 text-sm text-foreground align-top";

export default function BookingsView({
    bookings,
    isLoading,
    error,
    canManage,
    filters,
    courts,
    courtNameMap,
    onFiltersChange,
    onSearch,
    onRefresh,
    onCreateClick,
    onManageClick,
}: Props): JSX.Element {
    const [page, setPage] = useState(0);

    const totalPages = Math.ceil(bookings.length / PAGE_SIZE);

    // Render at most 20 rows (current page + next page) for DOM efficiency;
    // display only the current 10.
    const pageBookings = useMemo(
        () => bookings.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE),
        [bookings, page]
    );

    // Reset to first page when the bookings list changes (new search)
    useEffect(() => {
        setPage(0);
    }, [bookings]);

    return (
        <div className="w-full space-y-5">
            <Breadcrumb items={[{ label: "Bookings" }]} />

            <section className="card-surface overflow-hidden">
                {/* Header */}
                <header className="flex flex-col gap-3 border-b border-border bg-muted/10 px-5 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2.5">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary text-secondary-foreground shadow-xs">
                                <CalendarDays size={16} />
                            </div>
                            <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                    <h1 className="text-lg font-semibold tracking-tight text-foreground">
                                        Bookings
                                    </h1>
                                    {bookings.length > 0 ? (
                                        <span className="rounded-full border border-border bg-background px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground shadow-xs">
                                            {bookings.length} total
                                        </span>
                                    ) : null}
                                </div>
                                <p className="mt-0.5 text-sm text-muted-foreground">
                                    Manage all court bookings for your club
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                        <button
                            onClick={onRefresh}
                            className="btn-outline min-h-10 px-4"
                            aria-label="Refresh bookings"
                        >
                            <RefreshCw size={14} /> Refresh
                        </button>
                        {canManage ? (
                            <button onClick={onCreateClick} className="btn-cta min-h-10 px-4">
                                <Plus size={14} /> New Booking
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

                    {/* Unified 4-column grid — row 1: From / To / Player / Search (30/30/30/10), row 2: Type / Status / Court */}
                    <div className="grid grid-cols-1 gap-x-3 gap-y-3 sm:grid-cols-[3fr_3fr_3fr_1fr]">
                        {/* From */}
                        <div className="flex flex-col gap-1">
                            <span className="text-[11px] font-medium text-muted-foreground">
                                From
                            </span>
                            <DatePicker
                                value={filters.dateFrom}
                                onChange={(v) => onFiltersChange({ ...filters, dateFrom: v })}
                                placeholder="From date"
                            />
                        </div>

                        {/* To */}
                        <div className="flex flex-col gap-1">
                            <span className="text-[11px] font-medium text-muted-foreground">
                                To
                            </span>
                            <DatePicker
                                value={filters.dateTo}
                                onChange={(v) => onFiltersChange({ ...filters, dateTo: v })}
                                placeholder="To date"
                            />
                        </div>

                        {/* Player */}
                        <div className="flex flex-col gap-1">
                            <span className="text-[11px] font-medium text-muted-foreground">
                                Player
                            </span>
                            <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 shadow-xs transition focus-within:border-cta focus-within:ring-2 focus-within:ring-cta-ring/30">
                                <User size={13} className="shrink-0 text-muted-foreground" />
                                <input
                                    type="text"
                                    value={filters.playerSearch}
                                    onChange={(e) =>
                                        onFiltersChange({
                                            ...filters,
                                            playerSearch: e.target.value,
                                        })
                                    }
                                    placeholder="Name or email…"
                                    className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                                    aria-label="Search by player name or email"
                                />
                            </div>
                        </div>

                        {/* col 4, row 1 — intentionally empty */}
                        <div className="hidden sm:block" />

                        {/* Type — col 1, row 2 */}
                        <div className="flex flex-col gap-1">
                            <span className="text-[11px] font-medium text-muted-foreground">
                                Type
                            </span>
                            <SelectInput
                                value={filters.bookingType}
                                onValueChange={(v) =>
                                    onFiltersChange({ ...filters, bookingType: v })
                                }
                                options={BOOKING_TYPE_OPTIONS.filter((o) => o.value !== "")}
                                placeholder="All types"
                                clearLabel="All types"
                            />
                        </div>

                        {/* Status — col 2, row 2 */}
                        <div className="flex flex-col gap-1">
                            <span className="text-[11px] font-medium text-muted-foreground">
                                Status
                            </span>
                            <SelectInput
                                value={filters.bookingStatus}
                                onValueChange={(v) =>
                                    onFiltersChange({ ...filters, bookingStatus: v })
                                }
                                options={BOOKING_STATUS_OPTIONS.filter((o) => o.value !== "")}
                                placeholder="All statuses"
                                clearLabel="All statuses"
                            />
                        </div>

                        {/* Court — col 3, row 2 */}
                        <div className="flex flex-col gap-1">
                            <span className="text-[11px] font-medium text-muted-foreground">
                                Court
                            </span>
                            <SelectInput
                                value={filters.courtId}
                                onValueChange={(v) => onFiltersChange({ ...filters, courtId: v })}
                                options={courts.map((c) => ({ value: c.id, label: c.name }))}
                                placeholder="All courts"
                                clearLabel="All courts"
                            />
                        </div>

                        {/* Search button — col 4, row 2 */}
                        <div className="flex flex-col justify-end">
                            <button
                                onClick={onSearch}
                                className="btn-cta h-[38px] w-full whitespace-nowrap px-2"
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
                        <span className="text-sm text-muted-foreground">Loading bookings…</span>
                    </div>
                ) : error ? (
                    <div className="m-5 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                        {error.message}
                    </div>
                ) : bookings.length === 0 ? (
                    <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
                        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                            <CalendarDays size={24} className="text-muted-foreground/40" />
                        </div>
                        <h3 className="text-sm font-semibold text-foreground">No bookings found</h3>
                        <p className="mt-1.5 max-w-xs text-xs text-muted-foreground">
                            No bookings match your filters. Try adjusting the date range or create a
                            new booking.
                        </p>
                        {canManage ? (
                            <button onClick={onCreateClick} className="btn-cta mt-5">
                                <Plus size={14} /> New Booking
                            </button>
                        ) : null}
                    </div>
                ) : (
                    <div className="overflow-x-auto" key={page}>
                        <table className="w-full min-w-[960px] border-collapse">
                            <thead>
                                <tr className="border-b border-border bg-muted/30">
                                    <th className={thCls}>Court</th>
                                    <th className={thCls}>Type</th>
                                    <th className={thCls}>Status</th>
                                    <th className={thCls}>Start</th>
                                    <th className={thCls}>End</th>
                                    <th className={thCls}>Players</th>
                                    <th className={thCls}>Slots left</th>
                                    <th className={thCls}>Total</th>
                                    {canManage ? (
                                        <th className={`${thCls} text-right`}>Actions</th>
                                    ) : null}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {pageBookings.map((booking) => {
                                    const statusColors =
                                        BOOKING_STATUS_COLORS[booking.status] ??
                                        BOOKING_STATUS_COLORS["pending"]!;
                                    const courtLabel =
                                        courtNameMap[booking.court_id] ?? booking.court_name;

                                    return (
                                        <tr
                                            key={booking.id}
                                            className="transition hover:bg-muted/20"
                                        >
                                            <td className={tdCls}>
                                                <span className="font-medium text-foreground">
                                                    {courtLabel}
                                                </span>
                                                {booking.event_name ? (
                                                    <p className="mt-0.5 text-xs text-muted-foreground">
                                                        {booking.event_name}
                                                    </p>
                                                ) : null}
                                            </td>

                                            <td className={tdCls}>
                                                <span className="text-muted-foreground">
                                                    {BOOKING_TYPE_LABELS[booking.booking_type] ??
                                                        booking.booking_type}
                                                </span>
                                                {booking.is_open_game ? (
                                                    <span className="ml-1.5 rounded-full bg-info/15 px-1.5 py-0.5 text-[10px] font-medium text-info">
                                                        Open
                                                    </span>
                                                ) : null}
                                            </td>

                                            <td className={tdCls}>
                                                <span
                                                    className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${statusColors.bg} ${statusColors.text}`}
                                                >
                                                    {BOOKING_STATUS_LABELS[booking.status] ??
                                                        booking.status}
                                                </span>
                                            </td>

                                            <td className={tdCls}>
                                                <span className="whitespace-nowrap text-muted-foreground">
                                                    {formatUTCDateTime(booking.start_datetime)}
                                                </span>
                                            </td>

                                            <td className={tdCls}>
                                                <span className="whitespace-nowrap text-muted-foreground">
                                                    {formatUTCDateTime(booking.end_datetime)}
                                                </span>
                                            </td>

                                            <td className={tdCls}>
                                                <span className="text-muted-foreground">
                                                    {booking.players.length}
                                                    {booking.max_players != null
                                                        ? ` / ${booking.max_players}`
                                                        : ""}
                                                </span>
                                            </td>

                                            <td className={tdCls}>
                                                <span
                                                    className={
                                                        booking.slots_available === 0
                                                            ? "text-destructive"
                                                            : "text-muted-foreground"
                                                    }
                                                >
                                                    {booking.slots_available}
                                                </span>
                                            </td>

                                            <td className={tdCls}>
                                                <span className="text-muted-foreground">
                                                    {formatCurrency(booking.total_price)}
                                                </span>
                                            </td>

                                            {canManage ? (
                                                <td className={`${tdCls} text-right`}>
                                                    <button
                                                        onClick={() => onManageClick(booking.id)}
                                                        className="inline-flex items-center justify-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs text-foreground transition hover:bg-muted"
                                                        aria-label={`Manage booking on ${courtLabel}`}
                                                    >
                                                        <Settings2 size={13} /> Manage
                                                    </button>
                                                </td>
                                            ) : null}
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
                            {Math.min((page + 1) * PAGE_SIZE, bookings.length)} of {bookings.length}
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
