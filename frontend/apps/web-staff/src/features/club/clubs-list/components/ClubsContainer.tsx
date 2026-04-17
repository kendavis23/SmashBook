import { useListClubs } from "../../hooks";
import { useClubAccess } from "../../store";
import type { Club } from "../../types";
import { AlertToast } from "@repo/ui";
import { useNavigate, useSearch } from "@tanstack/react-router";
import type { JSX } from "react";
import { useCallback, useEffect, useState } from "react";
import ClubsView from "./ClubsView";

export default function ClubsContainer(): JSX.Element {
    const [search, setSearch] = useState("");

    const { data: clubs = [], isLoading, error, refetch } = useListClubs();
    const navigate = useNavigate();
    const { isOwner, clubId } = useClubAccess();

    const searchParams = useSearch({ strict: false }) as {
        created?: boolean;
        updated?: boolean;
    };
    const [successMsg] = useState(
        searchParams.created
            ? "Club created successfully."
            : searchParams.updated
              ? "Club updated successfully."
              : ""
    );
    const [showSuccess, setShowSuccess] = useState(!!successMsg);

    useEffect(() => {
        if (searchParams.created || searchParams.updated) {
            void navigate({
                to: "/clubs",
                search: { created: undefined, updated: undefined },
                replace: true,
            });
        }
    }, []);

    useEffect(() => {
        if (!isOwner && clubId) {
            void navigate({ to: "/clubs/$clubId", params: { clubId } });
        }
    }, [isOwner, clubId, navigate]);

    const filtered = (clubs as Club[]).filter((c) =>
        c.name.toLowerCase().includes(search.toLowerCase())
    );

    const handleRefresh = useCallback(() => void refetch(), [refetch]);

    const handleCreateClick = useCallback(
        () =>
            void navigate({
                to: "/clubs/new",
            }),
        [navigate]
    );

    const handleNavigateToClub = useCallback(
        (id: string) => void navigate({ to: "/clubs/$clubId", params: { clubId: id } }),
        [navigate]
    );

    return (
        <>
            <ClubsView
                clubs={filtered}
                search={search}
                isLoading={isLoading}
                error={error as Error | null}
                onSearchChange={setSearch}
                onRefresh={handleRefresh}
                onCreateClick={handleCreateClick}
                onManageClub={handleNavigateToClub}
            />
            {showSuccess ? (
                <AlertToast
                    title={successMsg}
                    variant="success"
                    onClose={() => setShowSuccess(false)}
                />
            ) : null}
        </>
    );
}
