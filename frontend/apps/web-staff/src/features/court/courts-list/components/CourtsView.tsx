import type { Court, CourtAvailability, TimeSlot, AvailabilityFilters } from "../../types";
import { SURFACE_TYPE_LABELS, SURFACE_FILTER_OPTIONS } from "../../types";
import { Breadcrumb, DatePicker, SelectInput, TimeInput } from "@repo/ui";
import { Circle, Pencil, CalendarSearch, RefreshCw, Plus, Search, Layers } from "lucide-react";
import type { JSX } from "react";
import AvailabilityPanel from "./AvailabilityPanel";

type Props = {
    courts: Court[];
    isLoading: boolean;
    error: Error | null;
    canCreateCourt: boolean;
    canEditCourt: boolean;
    filters: AvailabilityFilters;
    hasPendingServerFilters: boolean;
    hasActiveServerFilters: boolean;
    onFiltersChange: (filters: AvailabilityFilters) => void;
    onSearch: () => void;
    onCreateClick: () => void;
    onEditCourt: (court: Court) => void;
    onRefresh: () => void;
    availabilityCourt: Court | null;
    availabilityDate: string;
    availability: CourtAvailability | undefined;
    availabilityLoading: boolean;
    availabilityError: Error | null;
    selectedSlot: TimeSlot | null;
    onCheckAvailability: (court: Court) => void;
    onCloseAvailability: () => void;
    onAvailabilityDateChange: (date: string) => void;
    onRefreshAvailability: () => void;
    onSelectSlot: (slot: TimeSlot | null) => void;
    onBookSlot: (slot: TimeSlot) => void;
};

function formatSurcharge(amount: number | string | null): string {
    if (amount == null) {
        return "Lighting included";
    }

    const surcharge = typeof amount === "string" ? Number.parseFloat(amount) : amount;

    if (Number.isNaN(surcharge)) {
        return "Lighting included";
    }

    return `Surcharge ${surcharge.toFixed(2)}`;
}

export default function CourtsView({
    courts,
    isLoading,
    error,
    canCreateCourt,
    canEditCourt,
    filters,
    hasPendingServerFilters: _hasPendingServerFilters,
    hasActiveServerFilters,
    onFiltersChange,
    onSearch,
    onCreateClick,
    onEditCourt,
    onRefresh,
    availabilityCourt,
    availabilityDate,
    availability,
    availabilityLoading,
    availabilityError,
    selectedSlot,
    onCheckAvailability,
    onCloseAvailability,
    onAvailabilityDateChange,
    onRefreshAvailability,
    onSelectSlot,
    onBookSlot,
}: Props): JSX.Element {
    return (
        <div className="w-full space-y-5">
            <Breadcrumb items={[{ label: "Courts" }]} />

            <section className="card-surface overflow-hidden">
                <header className="flex flex-col gap-3 border-b border-border bg-muted/10 px-5 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2.5">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary text-secondary-foreground shadow-xs">
                                <Circle size={16} />
                            </div>
                            <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                    <h1 className="text-lg font-semibold tracking-tight text-foreground">
                                        Courts
                                    </h1>
                                    {courts.length > 0 ? (
                                        <span className="rounded-full border border-border bg-background px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground shadow-xs">
                                            {courts.length} total
                                        </span>
                                    ) : null}
                                </div>
                                <p className="mt-0.5 text-sm text-muted-foreground">
                                    Manage your club&apos;s courts and availability
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                        <button
                            onClick={onRefresh}
                            className="btn-outline min-h-10 px-4"
                            aria-label="Refresh courts"
                        >
                            <RefreshCw size={14} /> Refresh
                        </button>
                        {canCreateCourt ? (
                            <button onClick={onCreateClick} className="btn-cta min-h-10 px-4">
                                <Plus size={14} /> Add Court
                            </button>
                        ) : null}
                    </div>
                </header>

                <div className="border-b border-border bg-muted/20 px-5 py-4 sm:px-6">
                    <div className="mb-3 flex items-center gap-2">
                        <Search size={13} className="text-muted-foreground" />
                        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Filters
                        </span>
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1fr_auto]">
                        {/* Surface */}
                        <div className="flex flex-col gap-1">
                            <span className="text-[11px] font-medium text-muted-foreground">
                                Surface
                            </span>
                            <SelectInput
                                value={filters.surfaceType === "" ? "all" : filters.surfaceType}
                                options={SURFACE_FILTER_OPTIONS}
                                onValueChange={(v) =>
                                    onFiltersChange({
                                        ...filters,
                                        surfaceType: v === "all" ? "" : v,
                                    })
                                }
                                placeholder="Filter by surface type"
                                startIcon={<Layers size={13} />}
                            />
                        </div>

                        {/* Date */}
                        <div className="flex flex-col gap-1">
                            <span className="text-[11px] font-medium text-muted-foreground">
                                Date
                            </span>
                            <DatePicker
                                value={filters.date}
                                onChange={(v) => onFiltersChange({ ...filters, date: v })}
                                placeholder="Pick a date"
                                className="input-base"
                            />
                        </div>

                        {/* From time */}
                        <div className="flex flex-col gap-1">
                            <span className="text-[11px] font-medium text-muted-foreground">
                                From
                            </span>
                            <TimeInput
                                value={filters.timeFrom}
                                onChange={(e) =>
                                    onFiltersChange({ ...filters, timeFrom: e.target.value })
                                }
                                className="input-base rounded-lg px-3 py-2 text-sm"
                                aria-label="Filter from time"
                            />
                        </div>

                        {/* To time */}
                        <div className="flex flex-col gap-1">
                            <span className="text-[11px] font-medium text-muted-foreground">
                                To
                            </span>
                            <TimeInput
                                value={filters.timeTo}
                                onChange={(e) =>
                                    onFiltersChange({ ...filters, timeTo: e.target.value })
                                }
                                className="input-base rounded-lg px-3 py-2 text-sm"
                                aria-label="Filter to time"
                            />
                        </div>

                        {/* Search button aligned to bottom */}
                        <div className="flex flex-col justify-end">
                            <button
                                onClick={onSearch}
                                className="btn-cta h-[38px] w-full whitespace-nowrap px-5 lg:w-auto"
                                aria-label="Apply filters"
                            >
                                <Search size={14} />
                                Search
                            </button>
                        </div>
                    </div>
                </div>

                <div className="grid min-w-0 xl:grid-cols-[minmax(0,1.1fr)_minmax(460px,1fr)]">
                    <div className="min-w-0 border-b border-border xl:border-b-0 xl:border-r xl:border-border">
                        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-6">
                            <div>
                                <h2 className="text-sm font-semibold text-foreground">
                                    Court list
                                </h2>
                                <p className="mt-0.5 text-xs text-muted-foreground">
                                    Quick access to surface, lighting, status, and schedule.
                                </p>
                            </div>
                            <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                                {courts.length} total
                            </span>
                        </div>

                        {isLoading ? (
                            <div className="flex items-center justify-center gap-3 py-20">
                                <span className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-cta" />
                                <span className="text-sm text-muted-foreground">
                                    Loading courts…
                                </span>
                            </div>
                        ) : error ? (
                            <div className="m-5 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                                {error.message}
                            </div>
                        ) : courts.length === 0 ? (
                            <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
                                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                                    <Circle size={24} className="text-muted-foreground/40" />
                                </div>
                                <h3 className="text-sm font-semibold text-foreground">
                                    {hasActiveServerFilters
                                        ? "No courts match your filters"
                                        : "No courts yet"}
                                </h3>
                                <p className="mt-1.5 max-w-xs text-xs text-muted-foreground">
                                    {hasActiveServerFilters
                                        ? "Try adjusting surface, date, or time range and search again."
                                        : "Add your first court to start managing bookings and availability."}
                                </p>
                                {!hasActiveServerFilters && canCreateCourt ? (
                                    <button onClick={onCreateClick} className="btn-cta mt-5">
                                        <Plus size={14} /> Add Court
                                    </button>
                                ) : null}
                            </div>
                        ) : (
                            <div className="max-h-[42rem] overflow-y-auto px-4 py-4 sm:px-6">
                                <div className="grid gap-3">
                                    {courts.map((court) => {
                                        const isSelected = availabilityCourt?.id === court.id;

                                        return (
                                            <article
                                                key={court.id}
                                                className={`rounded-xl border p-4 shadow-xs transition-colors ${
                                                    isSelected
                                                        ? "border-cta bg-cta/5"
                                                        : "border-border bg-background hover:bg-muted/30"
                                                }`}
                                            >
                                                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                                    <div className="min-w-0 space-y-3">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <span
                                                                className={`h-2 w-2 rounded-full ${court.is_active ? "bg-success" : "bg-muted-foreground/30"}`}
                                                            />
                                                            <h3 className="text-sm font-semibold text-foreground sm:text-base">
                                                                {court.name}
                                                            </h3>
                                                            <span
                                                                className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                                                                    court.is_active
                                                                        ? "bg-success/15 text-success"
                                                                        : "bg-muted text-muted-foreground"
                                                                }`}
                                                            >
                                                                {court.is_active
                                                                    ? "Active"
                                                                    : "Inactive"}
                                                            </span>
                                                        </div>

                                                        <div className="flex flex-wrap gap-2">
                                                            <span className="rounded-md bg-secondary px-2 py-1 text-xs font-medium text-foreground">
                                                                {SURFACE_TYPE_LABELS[
                                                                    court.surface_type
                                                                ] ?? court.surface_type}
                                                            </span>
                                                            <span
                                                                className={`rounded-md px-2 py-1 text-xs font-medium ${
                                                                    court.has_lighting
                                                                        ? "bg-warning/15 text-warning"
                                                                        : "bg-muted text-muted-foreground"
                                                                }`}
                                                            >
                                                                {court.has_lighting
                                                                    ? formatSurcharge(
                                                                          court.lighting_surcharge
                                                                      )
                                                                    : "No lighting"}
                                                            </span>
                                                        </div>

                                                        <p className="text-xs text-muted-foreground">
                                                            {isSelected
                                                                ? `Schedule open for ${availabilityDate}`
                                                                : "Use availability to inspect the selected day without leaving the list."}
                                                        </p>
                                                    </div>

                                                    <div className="flex flex-wrap items-center gap-2 lg:flex-col lg:items-stretch">
                                                        {canEditCourt ? (
                                                            <button
                                                                onClick={() => onEditCourt(court)}
                                                                className="btn-outline min-w-[104px] justify-center px-3 py-2 text-xs sm:text-sm"
                                                                aria-label={`Edit ${court.name}`}
                                                            >
                                                                <Pencil size={12} /> Edit
                                                            </button>
                                                        ) : null}
                                                        <button
                                                            onClick={() =>
                                                                onCheckAvailability(court)
                                                            }
                                                            className={`inline-flex min-w-[128px] items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition sm:text-sm ${
                                                                isSelected
                                                                    ? "bg-cta text-white"
                                                                    : "border border-border bg-background text-foreground hover:bg-muted"
                                                            }`}
                                                            aria-label={`Check availability for ${court.name}`}
                                                            aria-pressed={isSelected}
                                                        >
                                                            <CalendarSearch size={12} />
                                                            {isSelected
                                                                ? "Viewing"
                                                                : "Availability"}
                                                        </button>
                                                    </div>
                                                </div>
                                            </article>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="min-w-0 bg-muted/15">
                        {availabilityCourt ? (
                            <AvailabilityPanel
                                court={availabilityCourt}
                                date={availabilityDate}
                                availability={availability}
                                isLoading={availabilityLoading}
                                error={availabilityError}
                                onDateChange={onAvailabilityDateChange}
                                onRefresh={onRefreshAvailability}
                                onClose={onCloseAvailability}
                                onBookSlot={onBookSlot}
                                selectedSlot={selectedSlot}
                                onSelectSlot={onSelectSlot}
                            />
                        ) : (
                            <div className="flex min-h-[24rem] flex-col justify-center p-6 sm:p-7">
                                <div className="rounded-xl border border-dashed border-border bg-background px-5 py-6 text-center">
                                    <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
                                        <CalendarSearch size={16} />
                                    </div>
                                    <h2 className="text-sm font-semibold text-foreground">
                                        Schedule panel
                                    </h2>
                                    <p className="mt-1.5 text-sm text-muted-foreground">
                                        Select a court to inspect daily availability in a compact
                                        side panel.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </section>
        </div>
    );
}
