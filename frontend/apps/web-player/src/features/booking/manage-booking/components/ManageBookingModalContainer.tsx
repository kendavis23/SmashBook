import { useCallback, useMemo, useState } from "react";
import type { JSX } from "react";
import { useGetBooking, useInvitePlayer, useRespondInvite } from "../../hooks";
import { useMyProfile } from "@repo/player-domain/hooks";
import type { Booking, PlayerRole, InviteStatus, PaymentStatus } from "../../types";
import ManageBookingView from "./ManageBookingView";

type MyInfo = {
    role: PlayerRole;
    inviteStatus: InviteStatus;
    paymentStatus: PaymentStatus;
    amountDue: number;
};

type Props = {
    bookingId: string;
    clubId: string;
    onClose: () => void;
    onSuccess?: () => void;
};

export default function ManageBookingModalContainer({
    bookingId,
    clubId,
    onClose,
    onSuccess,
}: Props): JSX.Element {
    const { data: booking, isLoading, error, refetch } = useGetBooking(bookingId, clubId);
    const { data: profile } = useMyProfile();

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
    const [apiError, setApiError] = useState("");

    const inviteMutation = useInvitePlayer(clubId, bookingId);
    const respondMutation = useRespondInvite(clubId, bookingId);

    const handleInvitePlayer = useCallback(
        (userId: string): void => {
            inviteMutation.mutate(
                { user_id: userId },
                {
                    onSuccess: () => {
                        setApiError("");
                        onSuccess?.();
                    },
                    onError: (err) =>
                        setApiError(
                            (err as { message?: string })?.message ?? "Failed to invite player."
                        ),
                }
            );
        },
        [inviteMutation, onSuccess]
    );

    const handleRespondInvite = useCallback(
        (action: Extract<InviteStatus, "accepted" | "declined">): void => {
            respondMutation.mutate(
                { action },
                {
                    onSuccess: () => {
                        void refetch();
                        onSuccess?.();
                    },
                    onError: (err) =>
                        setApiError(
                            (err as { message?: string })?.message ?? "Failed to respond to invite."
                        ),
                }
            );
        },
        [respondMutation, refetch, onSuccess]
    );

    if (isLoading) {
        return (
            <div className="flex items-center justify-center gap-3 py-20">
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-cta" />
                <span className="text-sm text-muted-foreground">Loading booking…</span>
            </div>
        );
    }

    if (error || !booking) {
        return (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error instanceof Error ? error.message : "Booking not found."}
            </div>
        );
    }

    return (
        <ManageBookingView
            booking={booking as Booking}
            playerRole={playerRole}
            myInfo={myInfo}
            myUserId={profile?.id}
            apiError={apiError}
            isInvitePending={inviteMutation.isPending}
            isRespondPending={respondMutation.isPending}
            onInvitePlayer={handleInvitePlayer}
            onRespondInvite={handleRespondInvite}
            onDismissError={() => setApiError("")}
            onRefresh={() => void refetch()}
            onBack={onClose}
            clubId={clubId}
            mode="modal"
            onClose={onClose}
        />
    );
}
