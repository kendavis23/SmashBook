import type { JSX } from "react";
import { useMemo } from "react";
import { Breadcrumb, AlertToast } from "@repo/ui";
import { CalendarDays, RefreshCw } from "lucide-react";
import type { PlayerBookingItem, BookingTab, InviteStatus } from "../../types";
import { BOOKING_TABS } from "../../types";
import PlayerBookingList from "./PlayerBookingList";
import PlayerPastFilter from "./PlayerPastFilter";
import PlayerUpcomingFilter from "./PlayerUpcomingFilter";

type Props = {
    upcoming: PlayerBookingItem[];
    past: PlayerBookingItem[];
    activeTab: BookingTab;
    isLoading: boolean;
    error: Error | null;
    pastFrom: string;
    pastTo: string;
    onTabChange: (tab: BookingTab) => void;
    onRefresh: () => void;
    onManageClick: (item: PlayerBookingItem) => void;
    onPayClick: (item: PlayerBookingItem) => void;
    onInvitePlayer: (item: PlayerBookingItem, userId: string) => Promise<void>;
    onRespondInvite: (
        item: PlayerBookingItem,
        action: Extract<InviteStatus, "accepted" | "declined">
    ) => Promise<void>;
    onPastFilterChange: (patch: { pastFrom?: string; pastTo?: string }) => void;
    onPastFilterApply: () => void;
    onPastFilterClear: () => void;
    upcomingSearch: string;
    upcomingFilterDate: string;
    onUpcomingSearchChange: (v: string) => void;
    onUpcomingDateChange: (v: string) => void;
    onUpcomingFilterClear: () => void;
};

export default function BookingsView({
    upcoming,
    past,
    activeTab,
    isLoading,
    error,
    pastFrom,
    pastTo,
    onTabChange,
    onRefresh,
    onManageClick,
    onPayClick,
    onInvitePlayer,
    onRespondInvite,
    onPastFilterChange,
    onPastFilterApply,
    onPastFilterClear,
    upcomingSearch,
    upcomingFilterDate,
    onUpcomingSearchChange,
    onUpcomingDateChange,
    onUpcomingFilterClear,
}: Props): JSX.Element {
    const filteredUpcoming = useMemo(() => {
        const term = upcomingSearch.trim().toLowerCase();
        return upcoming.filter((item) => {
            const matchesText =
                term === "" ||
                item.court_name.toLowerCase().includes(term) ||
                item.club_name.toLowerCase().includes(term);
            const matchesDate =
                upcomingFilterDate === "" ||
                item.start_datetime.slice(0, 10) === upcomingFilterDate;
            return matchesText && matchesDate;
        });
    }, [upcoming, upcomingSearch, upcomingFilterDate]);

    const items = activeTab === "upcoming" ? filteredUpcoming : past;
    const emptyMessage = activeTab === "upcoming" ? "No upcoming bookings." : "No past bookings.";

    return (
        <div className="w-full space-y-5">
            <Breadcrumb items={[{ label: "Bookings" }]} />

            <section className="card-surface overflow-hidden">
                {/* Header */}
                <header className="flex flex-row items-center justify-between gap-3 border-b border-border bg-muted/10 px-5 py-4 sm:px-6">
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2.5">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary text-secondary-foreground shadow-xs">
                                <CalendarDays size={16} />
                            </div>
                            <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                    <h1 className="text-lg font-semibold tracking-tight text-foreground">
                                        My Bookings
                                    </h1>
                                </div>
                                <p className="mt-0.5 text-sm text-muted-foreground">
                                    View your upcoming and past court bookings
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                        <button
                            onClick={onRefresh}
                            className="btn-outline min-h-10 px-4"
                            aria-label="Refresh bookings"
                        >
                            <RefreshCw size={14} /> Refresh
                        </button>
                    </div>
                </header>

                {/* Error */}
                {error ? (
                    <div className="px-5 py-5 sm:px-6">
                        <AlertToast
                            title={error.message || "Failed to load bookings."}
                            variant="error"
                        />
                    </div>
                ) : null}

                {/* Tabs */}
                <div>
                    <div className="flex gap-5 border-b border-border sm:px-2 mb-3">
                        {BOOKING_TABS.map((tab) => (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => onTabChange(tab.id)}
                                className={`-mb-px inline-flex items-center gap-1.5 border-b-2 px-1 py-3 text-sm font-medium transition ${
                                    activeTab === tab.id
                                        ? "border-cta text-cta"
                                        : "border-transparent text-muted-foreground hover:text-foreground"
                                }`}
                            >
                                {tab.label}
                                {tab.id === "upcoming" && upcoming.length > 0 ? (
                                    <span className="rounded-full bg-cta/10 px-1.5 py-0.5 text-[10px] font-semibold text-cta">
                                        {upcoming.length}
                                    </span>
                                ) : null}
                            </button>
                        ))}
                    </div>

                    {/* Upcoming filter bar */}
                    {activeTab === "upcoming" ? (
                        <PlayerUpcomingFilter
                            search={upcomingSearch}
                            filterDate={upcomingFilterDate}
                            onSearchChange={onUpcomingSearchChange}
                            onDateChange={onUpcomingDateChange}
                            onClear={onUpcomingFilterClear}
                        />
                    ) : null}

                    {/* Past filter bar */}
                    {activeTab === "past" ? (
                        <PlayerPastFilter
                            pastFrom={pastFrom}
                            pastTo={pastTo}
                            onPastFilterChange={onPastFilterChange}
                            onPastFilterApply={onPastFilterApply}
                            onPastFilterClear={onPastFilterClear}
                        />
                    ) : null}

                    {/* Content */}
                    {isLoading ? (
                        <div className="flex items-center justify-center gap-3 py-20">
                            <span className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-cta" />
                            <span className="text-sm text-muted-foreground">Loading bookings…</span>
                        </div>
                    ) : (
                        <PlayerBookingList
                            items={items}
                            emptyMessage={emptyMessage}
                            showActions={activeTab === "upcoming"}
                            onManageClick={onManageClick}
                            onPayClick={onPayClick}
                            onInvitePlayer={onInvitePlayer}
                            onRespondInvite={onRespondInvite}
                        />
                    )}
                </div>
            </section>
        </div>
    );
}
