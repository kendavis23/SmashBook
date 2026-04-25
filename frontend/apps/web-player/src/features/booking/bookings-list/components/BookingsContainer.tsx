import { useCallback, useEffect, useState } from "react";
import type { JSX } from "react";
import { useMyBookings, useInvitePlayer, useRespondInvite } from "../../hooks";
import type { BookingTab, InviteStatus } from "../../types";
import BookingsView from "./BookingsView";

type RespondTarget = {
    bookingId: string;
    clubId: string;
    action: Extract<InviteStatus, "accepted" | "declined">;
};

export default function BookingsContainer(): JSX.Element {
    const { data, isLoading, error, refetch } = useMyBookings();
    const [activeTab, setActiveTab] = useState<BookingTab>("upcoming");
    const [inviteBookingId, setInviteBookingId] = useState<string | null>(null);
    const [inviteClubId, setInviteClubId] = useState<string | null>(null);
    const [respondTarget, setRespondTarget] = useState<RespondTarget | null>(null);

    const invitePlayer = useInvitePlayer(inviteClubId ?? "", inviteBookingId ?? "");
    const {
        mutate: respondInvite,
        reset: resetRespondInvite,
        isPending: isRespondInvitePending,
        error: respondInviteError,
    } = useRespondInvite(respondTarget?.clubId ?? "", respondTarget?.bookingId ?? "");

    const handleRefresh = useCallback(() => void refetch(), [refetch]);
    const handleTabChange = useCallback((tab: BookingTab) => setActiveTab(tab), []);

    const handleOpenInvite = useCallback((bookingId: string, clubId: string) => {
        setInviteBookingId(bookingId);
        setInviteClubId(clubId);
    }, []);

    const handleCloseInvite = useCallback(() => {
        setInviteBookingId(null);
        setInviteClubId(null);
        invitePlayer.reset();
    }, [invitePlayer]);

    const handleInvite = useCallback(
        (userId: string) => {
            invitePlayer.mutate({ user_id: userId }, { onSuccess: () => handleCloseInvite() });
        },
        [invitePlayer, handleCloseInvite]
    );

    const handleRespondInvite = useCallback(
        (
            bookingId: string,
            clubId: string,
            action: Extract<InviteStatus, "accepted" | "declined">
        ) => {
            resetRespondInvite();
            setRespondTarget({ bookingId, clubId, action });
        },
        [resetRespondInvite]
    );

    useEffect(() => {
        if (!respondTarget) return;

        respondInvite(
            { action: respondTarget.action },
            {
                onSuccess: () => void refetch(),
                onSettled: () => setRespondTarget(null),
            }
        );
    }, [refetch, respondInvite, respondTarget]);

    return (
        <BookingsView
            upcoming={data?.upcoming ?? []}
            past={data?.past ?? []}
            activeTab={activeTab}
            isLoading={isLoading}
            error={error}
            onTabChange={handleTabChange}
            onRefresh={handleRefresh}
            inviteDialogOpen={inviteBookingId !== null}
            isInvitePending={invitePlayer.isPending}
            inviteError={(invitePlayer.error as Error | null)?.message ?? null}
            isRespondInvitePending={isRespondInvitePending}
            respondInviteError={(respondInviteError as Error | null)?.message ?? null}
            onOpenInvite={handleOpenInvite}
            onCloseInvite={handleCloseInvite}
            onInvite={handleInvite}
            onDismissInviteError={() => invitePlayer.reset()}
            onRespondInvite={handleRespondInvite}
            onDismissRespondInviteError={resetRespondInvite}
        />
    );
}
