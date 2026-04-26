import { useCallback, useState } from "react";
import type { JSX } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { invitePlayerEndpoint } from "@repo/api-client/modules/share";
import { respondInviteEndpoint } from "@repo/api-client/modules/player";
import { useMyBookings } from "../../hooks";
import type { BookingTab, PlayerBookingItem, InviteStatus } from "../../types";
import BookingsView from "./BookingsView";

export default function BookingsContainer(): JSX.Element {
    const { data, isLoading, error, refetch } = useMyBookings();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState<BookingTab>("upcoming");

    const handleRefresh = useCallback(() => void refetch(), [refetch]);
    const handleTabChange = useCallback((tab: BookingTab) => setActiveTab(tab), []);
    const handleCreateClick = useCallback(() => void navigate({ to: "/bookings/new" }), [navigate]);

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
                .then(() => undefined),
        [respondMutation]
    );

    const handleManageClick = useCallback(
        (item: PlayerBookingItem): void => {
            void navigate({
                to: "/bookings/$bookingId",
                params: { bookingId: item.booking_id },
                search: {
                    clubId: item.club_id,
                    role: item.role,
                    inviteStatus: item.invite_status,
                    paymentStatus: item.payment_status,
                    amountDue: item.amount_due,
                },
            });
        },
        [navigate]
    );

    return (
        <BookingsView
            upcoming={data?.upcoming ?? []}
            past={data?.past ?? []}
            activeTab={activeTab}
            isLoading={isLoading}
            error={error}
            onTabChange={handleTabChange}
            onRefresh={handleRefresh}
            onCreateClick={handleCreateClick}
            onManageClick={handleManageClick}
            onInvitePlayer={handleInvitePlayer}
            onRespondInvite={handleRespondInvite}
        />
    );
}
