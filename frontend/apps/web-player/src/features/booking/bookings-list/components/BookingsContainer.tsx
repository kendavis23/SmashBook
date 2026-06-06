import { useCallback, useMemo, useRef, useState } from "react";
import type { JSX } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { invitePlayerEndpoint } from "@repo/api-client/modules/share";
import { respondInviteEndpoint } from "@repo/api-client/modules/player";
import { useMyBookings, useGetBooking, useInvitePlayer, useRespondInvite } from "../../hooks";
import { useMyProfile } from "@repo/player-domain/hooks";
import type {
    BookingTab,
    PlayerBookingItem,
    InviteStatus,
    Booking,
    PlayerRole,
    PaymentStatus,
} from "../../types";
import BookingsView from "./BookingsView";
import { ManageBookingModalView } from "../../manage-booking/components/ManageBookingModalView";
import { PaymentModal } from "../../../payment";
import { X } from "lucide-react";

type SelectedBooking = { bookingId: string; clubId: string };
type PayingBooking = { item: PlayerBookingItem; onSuccess?: () => void };

type MyInfo = {
    role: PlayerRole;
    inviteStatus: InviteStatus;
    paymentStatus: PaymentStatus;
    amountDue: number;
};

function BookingModal({
    selected,
    onClose,
    onPayClick,
}: {
    selected: SelectedBooking;
    onClose: () => void;
    onPayClick: (item: PlayerBookingItem, onSuccess?: () => void) => void;
}): JSX.Element {
    const {
        data: booking,
        isLoading,
        error,
        refetch,
    } = useGetBooking(selected.bookingId, selected.clubId);
    const { data: profile } = useMyProfile();
    const [apiError, setApiError] = useState("");

    const inviteMutation = useInvitePlayer(selected.clubId, selected.bookingId);
    const respondMutation = useRespondInvite(selected.clubId, selected.bookingId);

    const myInfo: MyInfo | undefined = useMemo(() => {
        if (!booking || !profile) return undefined;
        const me = booking.players.find((p) => p.user_id === profile.id);
        if (!me) return undefined;
        return {
            role: me.role,
            inviteStatus: me.invite_status,
            paymentStatus: me.payment_status,
            amountDue: me.amount_due,
        };
    }, [booking, profile]);

    const playerRole: PlayerRole = myInfo?.role ?? "player";

    const handleInvitePlayer = useCallback(
        (userId: string): void => {
            inviteMutation.mutate(
                { user_id: userId },
                {
                    onSuccess: () => setApiError(""),
                    onError: (err) =>
                        setApiError(
                            (err as { message?: string })?.message ?? "Failed to invite player."
                        ),
                }
            );
        },
        [inviteMutation]
    );

    const handleRespondInvite = useCallback(
        (action: Extract<InviteStatus, "accepted" | "declined">): void => {
            respondMutation.mutate(
                { action },
                {
                    onSuccess: () => void refetch(),
                    onError: (err) =>
                        setApiError(
                            (err as { message?: string })?.message ?? "Failed to respond to invite."
                        ),
                }
            );
        },
        [respondMutation, refetch]
    );

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
        >
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
                aria-hidden="true"
            />
            <div
                className="relative z-10 flex w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
                style={{ height: "90vh" }}
            >
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center gap-3 py-20 px-8">
                        <span className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-cta" />
                        <span className="text-sm text-muted-foreground">Loading booking…</span>
                    </div>
                ) : error || !booking ? (
                    <div className="flex flex-col gap-4 p-6">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-foreground">Error</p>
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
                            >
                                <X size={15} />
                            </button>
                        </div>
                        <p className="text-sm text-destructive">
                            {error instanceof Error ? error.message : "Booking not found."}
                        </p>
                    </div>
                ) : (
                    <ManageBookingModalView
                        booking={booking as Booking}
                        playerRole={playerRole}
                        myInfo={myInfo}
                        myUserId={profile?.id}
                        apiError={apiError}
                        isInvitePending={inviteMutation.isPending}
                        isRespondPending={respondMutation.isPending}
                        onInvitePlayer={handleInvitePlayer}
                        onRespondInvite={handleRespondInvite}
                        onPayClick={(item) =>
                            onPayClick(item, () => {
                                void refetch();
                                window.setTimeout(() => void refetch(), 1500);
                            })
                        }
                        onDismissError={() => setApiError("")}
                        onRefresh={() => void refetch()}
                        clubId={selected.clubId}
                        onClose={onClose}
                    />
                )}
            </div>
        </div>
    );
}

export default function BookingsContainer(): JSX.Element {
    const queryClient = useQueryClient();
    const { data: myProfile } = useMyProfile();
    const [activeTab, setActiveTab] = useState<BookingTab>("upcoming");
    const [pastTabVisited, setPastTabVisited] = useState(false);
    const [selectedBooking, setSelectedBooking] = useState<SelectedBooking | null>(null);
    const [payingBooking, setPayingBooking] = useState<PayingBooking | null>(null);
    const [paymentDeadlineIso, setPaymentDeadlineIso] = useState<string | undefined>(undefined);
    const invitePaymentSucceededRef = useRef(false);

    const defaultFrom = new Date();
    defaultFrom.setMonth(defaultFrom.getMonth() - 3);
    const defaultFromIso = defaultFrom.toISOString().slice(0, 10);
    const defaultToIso = new Date().toISOString().slice(0, 10);

    const [pastFrom, setPastFrom] = useState(defaultFromIso);
    const [pastTo, setPastTo] = useState(defaultToIso);
    const [appliedFrom, setAppliedFrom] = useState(defaultFromIso);
    const [appliedTo, setAppliedTo] = useState(defaultToIso);

    const [upcomingSearch, setUpcomingSearch] = useState("");
    const [upcomingFilterDate, setUpcomingFilterDate] = useState("");

    const {
        data: upcomingData,
        isLoading: isUpcomingLoading,
        error: upcomingError,
        refetch: refetchUpcoming,
    } = useMyBookings(undefined);

    const {
        data: pastData,
        isLoading: isPastLoading,
        error: pastError,
        refetch: refetchPast,
    } = useMyBookings(
        { past_from: appliedFrom || undefined, past_to: appliedTo || undefined },
        { enabled: pastTabVisited }
    );

    const isLoading = activeTab === "upcoming" ? isUpcomingLoading : isPastLoading;
    const error = activeTab === "upcoming" ? upcomingError : pastError;

    const handleRefresh = useCallback(() => {
        if (activeTab === "upcoming") void refetchUpcoming();
        else void refetchPast();
    }, [activeTab, refetchUpcoming, refetchPast]);

    const handleTabChange = useCallback((tab: BookingTab) => {
        setActiveTab(tab);
        if (tab === "past") setPastTabVisited(true);
    }, []);

    const inviteMutation = useMutation({
        mutationFn: ({
            bookingId,
            clubId,
            userId,
        }: {
            bookingId: string;
            clubId: string;
            userId: string;
        }) => invitePlayerEndpoint(bookingId, clubId, { user_id: userId }),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ["player", "bookings"] });
        },
    });

    const respondMutation = useMutation({
        mutationFn: ({
            bookingId,
            clubId,
            action,
        }: {
            bookingId: string;
            clubId: string;
            action: InviteStatus;
        }) => respondInviteEndpoint(bookingId, clubId, { action }),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ["player", "bookings"] });
        },
    });

    const handleInvitePlayer = useCallback(
        (item: PlayerBookingItem, userId: string): Promise<void> =>
            inviteMutation
                .mutateAsync({ bookingId: item.booking_id, clubId: item.club_id, userId })
                .then(() => undefined),
        [inviteMutation]
    );

    const handleRespondInvite = useCallback(
        (
            item: PlayerBookingItem,
            action: Extract<InviteStatus, "accepted" | "declined">
        ): Promise<void> =>
            respondMutation
                .mutateAsync({ bookingId: item.booking_id, clubId: item.club_id, action })
                .then((booking) => {
                    if (action !== "accepted") return;
                    const me = booking.players.find((p) => p.user_id === myProfile?.id);
                    if (!me || me.amount_due <= 0) return;
                    const payItem: PlayerBookingItem = {
                        booking_id: booking.id,
                        club_id: booking.club_id,
                        club_name: booking.club_name ?? "",
                        court_id: booking.court_id,
                        court_name: booking.court_name,
                        booking_type: booking.booking_type,
                        status: booking.status,
                        start_datetime: booking.start_datetime,
                        end_datetime: booking.end_datetime,
                        role: me.role,
                        invite_status: me.invite_status,
                        payment_status: me.payment_status,
                        amount_due: me.amount_due,
                    };
                    setPaymentDeadlineIso(new Date(Date.now() + 5 * 60 * 1000).toISOString());
                    setPayingBooking({ item: payItem });
                }),
        [respondMutation, myProfile]
    );

    const handleManageClick = useCallback((item: PlayerBookingItem): void => {
        setSelectedBooking({ bookingId: item.booking_id, clubId: item.club_id });
    }, []);

    const handleCloseModal = useCallback((): void => {
        setSelectedBooking(null);
    }, []);

    const handlePayClick = useCallback((item: PlayerBookingItem, onSuccess?: () => void): void => {
        setPayingBooking({ item, onSuccess });
    }, []);

    const refreshCurrentBookings = useCallback((): void => {
        const refetch = activeTab === "upcoming" ? refetchUpcoming : refetchPast;
        void refetch();
        window.setTimeout(() => void refetch(), 1500);
    }, [activeTab, refetchUpcoming, refetchPast]);

    const handlePaymentSuccess = useCallback((): void => {
        invitePaymentSucceededRef.current = true;
        refreshCurrentBookings();
        payingBooking?.onSuccess?.();
    }, [payingBooking, refreshCurrentBookings]);

    const handleClosePayModal = useCallback((): void => {
        const paid = invitePaymentSucceededRef.current;
        invitePaymentSucceededRef.current = false;
        setPayingBooking(null);
        setPaymentDeadlineIso(undefined);
        refreshCurrentBookings();
        if (!paid) payingBooking?.onSuccess?.();
    }, [payingBooking, refreshCurrentBookings]);

    const handlePastFilterChange = useCallback(
        (patch: { pastFrom?: string; pastTo?: string }): void => {
            if (patch.pastFrom !== undefined) setPastFrom(patch.pastFrom);
            if (patch.pastTo !== undefined) setPastTo(patch.pastTo);
        },
        []
    );

    const handlePastFilterApply = useCallback((): void => {
        setAppliedFrom(pastFrom);
        setAppliedTo(pastTo);
    }, [pastFrom, pastTo]);

    const handlePastFilterClear = useCallback((): void => {
        setPastFrom("");
        setPastTo("");
        setAppliedFrom("");
        setAppliedTo("");
    }, []);

    const handleUpcomingFilterClear = useCallback((): void => {
        setUpcomingSearch("");
        setUpcomingFilterDate("");
    }, []);

    return (
        <>
            <BookingsView
                upcoming={upcomingData?.upcoming ?? []}
                past={pastData?.past ?? []}
                activeTab={activeTab}
                isLoading={isLoading}
                error={error}
                pastFrom={pastFrom}
                pastTo={pastTo}
                onTabChange={handleTabChange}
                onRefresh={handleRefresh}
                onManageClick={handleManageClick}
                onPayClick={handlePayClick}
                onInvitePlayer={handleInvitePlayer}
                onRespondInvite={handleRespondInvite}
                onPastFilterChange={handlePastFilterChange}
                onPastFilterApply={handlePastFilterApply}
                onPastFilterClear={handlePastFilterClear}
                upcomingSearch={upcomingSearch}
                upcomingFilterDate={upcomingFilterDate}
                onUpcomingSearchChange={setUpcomingSearch}
                onUpcomingDateChange={setUpcomingFilterDate}
                onUpcomingFilterClear={handleUpcomingFilterClear}
            />
            {selectedBooking ? (
                <BookingModal
                    selected={selectedBooking}
                    onClose={handleCloseModal}
                    onPayClick={handlePayClick}
                />
            ) : null}
            {payingBooking ? (
                <PaymentModal
                    context={{ type: "booking", booking: payingBooking.item }}
                    paymentDeadline={paymentDeadlineIso ? new Date(paymentDeadlineIso) : undefined}
                    onClose={handleClosePayModal}
                    onSuccess={handlePaymentSuccess}
                />
            ) : null}
        </>
    );
}
