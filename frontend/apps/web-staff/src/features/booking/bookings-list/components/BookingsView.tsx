import type { JSX } from "react";
import { Breadcrumb, formatUTCDateTime } from "@repo/ui";
import {
    CalendarDays,
    CheckCircle2,
    Plus,
    RefreshCw,
    Search,
    Settings2,
    User,
    X,
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
    successMessage: string;
    onFiltersChange: (filters: BookingsListFilters) => void;
    onSearch: () => void;
    onRefresh: () => void;
    onCreateClick: () => void;
    onManageClick: (bookingId: string) => void;
    onDismissSuccess: () => void;
};

const thCls =
    "px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap";
const tdCls = "px-3 py-3 text-sm text-foreground align-top";

function formatCurrency(amount: number | null): string {
    if (amount == null) return "—";
    return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: "EUR",
        minimumFractionDigits: 2,
    }).format(amount);
}

export default function BookingsView({
    bookings,
    isLoading,
    error,
    canManage,
    filters,
    courts,
    courtNameMap,
    successMessage,
    onFiltersChange,
    onSearch,
    onRefresh,
    onCreateClick,
    onManageClick,
    onDismissSuccess,
}: Props): JSX.Element {
    return (
        <div className="w-full space-y-5">
            <Breadcrumb items={[{ label: "Bookings" }]} />

            {successMessage ? (
                <div className="flex items-center justify-between gap-3 rounded-lg border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">
                    <span className="flex items-center gap-2">
                        <CheckCircle2 size={16} className="shrink-0" />
                        {successMessage}
                    </span>
                    <button
                        onClick={onDismissSuccess}
                        aria-label="Dismiss"
                        className="shrink-0 text-success/70 transition hover:text-success"
                    >
                        <X size={16} />
                    </button>
                </div>
            ) : null}

            <section className="card-surface overflow-hidden">
                {/* Header */}
                <header className="flex flex-col gap-4 border-b border-border px-5 py-5 sm:px-6 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                        <h1 className="text-xl font-semibold tracking-tight text-foreground">
                            Bookings
                        </h1>
                        <p className="mt-1 text-sm text-muted-foreground">
                            {bookings.length > 0
                                ? `${bookings.length} booking${bookings.length !== 1 ? "s" : ""}`
                                : "Manage all court bookings for your club"}
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                        <button
                            onClick={onRefresh}
                            className="btn-outline min-h-11 px-4"
                            aria-label="Refresh bookings"
                        >
                            <RefreshCw size={14} /> Refresh
                        </button>
                        {canManage ? (
                            <button onClick={onCreateClick} className="btn-cta min-h-11 px-4.5">
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

                    {/* Unified 4-column grid — row 1: From / To / Player / Search, row 2: Type / Status / Court */}
                    <div className="grid grid-cols-1 gap-x-3 gap-y-3 sm:grid-cols-4">
                        {/* From */}
                        <div className="flex flex-col gap-1">
                            <span className="text-[11px] font-medium text-muted-foreground">
                                From
                            </span>
                            <input
                                type="date"
                                value={filters.dateFrom}
                                onChange={(e) =>
                                    onFiltersChange({ ...filters, dateFrom: e.target.value })
                                }
                                className="input-base rounded-lg px-3 py-2 text-sm"
                                aria-label="Filter from date"
                            />
                        </div>

                        {/* To */}
                        <div className="flex flex-col gap-1">
                            <span className="text-[11px] font-medium text-muted-foreground">
                                To
                            </span>
                            <input
                                type="date"
                                value={filters.dateTo}
                                onChange={(e) =>
                                    onFiltersChange({ ...filters, dateTo: e.target.value })
                                }
                                className="input-base rounded-lg px-3 py-2 text-sm"
                                aria-label="Filter to date"
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

                        {/* Search button — col 4, row 1 */}
                        <div className="flex flex-col justify-end">
                            <button
                                onClick={onSearch}
                                className="btn-cta h-[38px] w-full whitespace-nowrap px-5"
                                aria-label="Apply filters"
                            >
                                <Search size={14} /> Search
                            </button>
                        </div>

                        {/* Type — col 1, row 2 */}
                        <div className="flex flex-col gap-1">
                            <span className="text-[11px] font-medium text-muted-foreground">
                                Type
                            </span>
                            <div className="flex items-center rounded-lg border border-border bg-background px-3 py-2 shadow-xs transition focus-within:border-cta focus-within:ring-2 focus-within:ring-cta-ring/30">
                                <select
                                    value={filters.bookingType}
                                    onChange={(e) =>
                                        onFiltersChange({ ...filters, bookingType: e.target.value })
                                    }
                                    className="w-full bg-transparent text-sm text-foreground focus:outline-none"
                                    aria-label="Filter by booking type"
                                >
                                    {BOOKING_TYPE_OPTIONS.map((opt) => (
                                        <option key={opt.value} value={opt.value}>
                                            {opt.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Status — col 2, row 2 */}
                        <div className="flex flex-col gap-1">
                            <span className="text-[11px] font-medium text-muted-foreground">
                                Status
                            </span>
                            <div className="flex items-center rounded-lg border border-border bg-background px-3 py-2 shadow-xs transition focus-within:border-cta focus-within:ring-2 focus-within:ring-cta-ring/30">
                                <select
                                    value={filters.bookingStatus}
                                    onChange={(e) =>
                                        onFiltersChange({
                                            ...filters,
                                            bookingStatus: e.target.value,
                                        })
                                    }
                                    className="w-full bg-transparent text-sm text-foreground focus:outline-none"
                                    aria-label="Filter by status"
                                >
                                    {BOOKING_STATUS_OPTIONS.map((opt) => (
                                        <option key={opt.value} value={opt.value}>
                                            {opt.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Court — col 3, row 2 */}
                        <div className="flex flex-col gap-1">
                            <span className="text-[11px] font-medium text-muted-foreground">
                                Court
                            </span>
                            <div className="flex items-center rounded-lg border border-border bg-background px-3 py-2 shadow-xs transition focus-within:border-cta focus-within:ring-2 focus-within:ring-cta-ring/30">
                                <select
                                    value={filters.courtId}
                                    onChange={(e) =>
                                        onFiltersChange({ ...filters, courtId: e.target.value })
                                    }
                                    className="w-full bg-transparent text-sm text-foreground focus:outline-none"
                                    aria-label="Filter by court"
                                >
                                    <option value="">All courts</option>
                                    {courts.map((c) => (
                                        <option key={c.id} value={c.id}>
                                            {c.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* col 4, row 2 — intentionally empty for alignment */}
                        <div className="hidden sm:block" />
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
                    <div className="overflow-x-auto">
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
                                {bookings.map((booking) => {
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
            </section>
        </div>
    );
}
