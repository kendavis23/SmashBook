import { useListClubs } from "../../hooks";
import { useClubAccess } from "../../store";
import type { Club } from "../../types";
import { AlertToast } from "@repo/ui";
import { useNavigate } from "@tanstack/react-router";
import type { JSX } from "react";
import { useEffect, useState } from "react";
import ClubModal from "../../components/ClubModal";
import ClubsView from "./ClubsView";

export default function ClubsContainer(): JSX.Element {
    const [search, setSearch] = useState("");
    const [modalOpen, setModalOpen] = useState(false);
    const [successMsg, setSuccessMsg] = useState("");

    const { data: clubs = [], isLoading, error } = useListClubs();
    const navigate = useNavigate();
    const { isOwner, clubId } = useClubAccess();

    useEffect(() => {
        if (!isOwner && clubId) {
            void navigate({ to: "/clubs/$clubId", params: { clubId } });
        }
    }, [isOwner, clubId, navigate]);

    const filtered = (clubs as Club[]).filter((c) =>
        c.name.toLowerCase().includes(search.toLowerCase())
    );

    function handleNavigateToClub(id: string): void {
        void navigate({ to: "/clubs/$clubId", params: { clubId: id } });
    }

    return (
        <>
            <ClubsView
                clubs={filtered}
                search={search}
                isLoading={isLoading}
                error={error as Error | null}
                onSearchChange={setSearch}
                onCreateClick={() => setModalOpen(true)}
                onManageClub={handleNavigateToClub}
            />
            {successMsg ? (
                <AlertToast
                    title={successMsg}
                    variant="success"
                    onClose={() => setSuccessMsg("")}
                />
            ) : null}
            {modalOpen ? (
                <ClubModal onClose={() => setModalOpen(false)} onSuccess={setSuccessMsg} />
            ) : null}
        </>
    );
}
