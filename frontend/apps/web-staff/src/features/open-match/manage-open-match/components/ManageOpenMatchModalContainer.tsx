import { useCallback, useState } from "react";
import type { JSX } from "react";
import { useGetBooking, useInvitePlayer } from "../../hooks";
import { useClubAccess } from "../../store";
import type { Booking } from "../../types";
import { ManageOpenMatchModalView } from "./ManageOpenMatchModalView";

type Props = {
    bookingId: string;
    onClose: () => void;
};

export default function ManageOpenMatchModalContainer({ bookingId, onClose }: Props): JSX.Element {
    const { clubId } = useClubAccess();
    const { data: booking, isLoading, error } = useGetBooking(bookingId, clubId ?? "");
    const inviteMutation = useInvitePlayer(clubId ?? "", bookingId);
    const [apiError, setApiError] = useState("");

    const handleInvitePlayer = useCallback(
        (playerId: string): void => {
            const userId = playerId.trim();
            if (!userId) {
                setApiError("Player ID is required.");
                return;
            }

            inviteMutation.mutate(
                { user_id: userId },
                {
                    onSuccess: () => {
                        setApiError("");
                    },
                    onError: (err) => {
                        setApiError(
                            (err as { message?: string })?.message || "Failed to invite player."
                        );
                    },
                }
            );
        },
        [inviteMutation]
    );

    if (isLoading) {
        return (
            <div className="flex items-center justify-center gap-3 py-20">
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-cta" />
                <span className="text-sm text-muted-foreground">Loading open match…</span>
            </div>
        );
    }

    if (error || !booking) {
        return (
            <div className="m-5 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error instanceof Error ? error.message : "Open match not found."}
            </div>
        );
    }

    return (
        <ManageOpenMatchModalView
            booking={booking as Booking}
            apiError={apiError}
            isInviting={inviteMutation.isPending}
            onInvitePlayer={handleInvitePlayer}
            onDismissError={() => setApiError("")}
            onClose={onClose}
        />
    );
}
