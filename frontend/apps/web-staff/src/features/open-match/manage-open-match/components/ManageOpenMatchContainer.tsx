import type { JSX } from "react";
import { useCallback, useState } from "react";
import { useNavigate, useParams, useSearch } from "@tanstack/react-router";
import { Breadcrumb } from "@repo/ui";
import { useGetBooking, useInvitePlayer } from "../../hooks";
import { useClubAccess } from "../../store";
import type { Booking } from "../../types";
import ManageOpenMatchView from "./ManageOpenMatchView";

type ManageOpenMatchSearch = {
    date?: string;
    minSkill?: string;
    maxSkill?: string;
};

type OpenMatchRouteSearch = {
    date: string | undefined;
    minSkill: string | undefined;
    maxSkill: string | undefined;
};

function buildOpenMatchSearch(search: ManageOpenMatchSearch): OpenMatchRouteSearch {
    return {
        date: search.date,
        minSkill: search.minSkill,
        maxSkill: search.maxSkill,
    };
}

export default function ManageOpenMatchContainer(): JSX.Element {
    const navigate = useNavigate();
    const { bookingId } = useParams({ strict: false }) as { bookingId: string };
    const filterSearch = useSearch({ strict: false }) as ManageOpenMatchSearch;
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

    const handleBack = useCallback((): void => {
        void navigate({
            to: "/open-match",
            search: buildOpenMatchSearch(filterSearch),
        });
    }, [navigate, filterSearch]);

    const breadcrumb = (
        <Breadcrumb items={[{ label: "Open Matches", onClick: handleBack }, { label: "Manage" }]} />
    );

    if (isLoading) {
        return (
            <div className="w-full space-y-5">
                {breadcrumb}
                <div className="flex items-center justify-center gap-3 py-20">
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-cta" />
                    <span className="text-sm text-muted-foreground">Loading open match…</span>
                </div>
            </div>
        );
    }

    if (error || !booking) {
        return (
            <div className="w-full space-y-5">
                {breadcrumb}
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                    {error instanceof Error ? error.message : "Open match not found."}
                </div>
            </div>
        );
    }

    return (
        <ManageOpenMatchView
            booking={booking as Booking}
            apiError={apiError}
            isInviting={inviteMutation.isPending}
            onInvitePlayer={handleInvitePlayer}
            onDismissError={() => setApiError("")}
            onBack={handleBack}
        />
    );
}
