import { useListClubs } from "../hooks";
import { useClubAccess } from "../store";
import type { Club } from "../types";
import { AlertToast, Breadcrumb } from "@repo/ui";
import { useNavigate } from "@tanstack/react-router";
import { Building2, Search, Settings, X } from "lucide-react";
import type { JSX } from "react";
import { useEffect, useState } from "react";

import ClubModal from "../components/ClubModal";

export default function ClubsPage(): JSX.Element {
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

    function openCreate(): void {
        setModalOpen(true);
    }

    return (
        <div className="w-full space-y-5">
            {/* Page header */}
            <div className="flex items-center justify-between">
                <div className="">
                    <Breadcrumb items={[{ label: "Clubs" }]} />
                </div>
            </div>

            <div className="card-surface overflow-hidden">
                {/* Toolbar */}
                <div className="border-b border-border px-5 py-3 flex items-center justify-between gap-3">
                    <div className="relative flex w-full max-w-xs items-center">
                        <Search
                            size={14}
                            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50"
                        />
                        <input
                            type="text"
                            placeholder="Search clubs…"
                            className="search-input"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                        {search && (
                            <button
                                type="button"
                                onClick={() => setSearch("")}
                                className="search-clear-btn"
                                aria-label="Clear search"
                            >
                                <X size={11} />
                            </button>
                        )}
                    </div>
                    {/* Button */}
                    <div>
                        <button onClick={openCreate} className="btn-cta">
                            + Create Club
                        </button>
                    </div>
                </div>

                {/* Content */}
                {isLoading ? (
                    <div className="flex items-center gap-2.5 px-5 py-10 text-[13px] text-muted-foreground">
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-border border-t-cta" />
                        Loading clubs…
                    </div>
                ) : error ? (
                    <div className="m-5 feedback-error">{(error as Error).message}</div>
                ) : filtered.length === 0 ? (
                    <section className="px-6 py-16 text-center">
                        <Building2 size={32} className="mx-auto mb-3 text-muted-foreground/30" />
                        <h3 className="text-[15px] font-semibold text-foreground">
                            {search ? "No clubs match your search" : "No clubs yet"}
                        </h3>
                        <p className="mx-auto mt-1.5 max-w-sm text-[13px] text-muted-foreground">
                            {search
                                ? "Try a different search term."
                                : "Create your first club to start managing courts, bookings, and players."}
                        </p>
                        {!search ? (
                            <button onClick={openCreate} className="btn-cta mt-5">
                                + Create Club
                            </button>
                        ) : null}
                    </section>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-border bg-muted/20">
                                    <th className="table-th">Name</th>
                                    <th className="table-th">Address</th>
                                    <th className="table-th">Currency</th>
                                    <th className="table-th text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((club) => (
                                    <tr key={club.id} className="table-row-hover">
                                        <td className="table-td font-medium">{club.name}</td>
                                        <td className="table-td text-muted-foreground">
                                            {club.address ?? (
                                                <span className="text-muted-foreground/30">—</span>
                                            )}
                                        </td>
                                        <td className="table-td">
                                            <span className="rounded-md bg-secondary px-2 py-0.5 text-[11px] font-medium text-secondary-foreground">
                                                {club.currency}
                                            </span>
                                        </td>
                                        <td className="table-td">
                                            <div className="flex items-center justify-end">
                                                <button
                                                    onClick={() =>
                                                        void navigate({
                                                            to: "/clubs/$clubId",
                                                            params: { clubId: club.id },
                                                        })
                                                    }
                                                    className="btn-ghost-sm"
                                                >
                                                    <Settings size={11} /> Manage
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {successMsg ? <AlertToast title={successMsg} variant="success" onClose={() => setSuccessMsg("")} /> : null}
            {modalOpen ? <ClubModal onClose={() => setModalOpen(false)} onSuccess={setSuccessMsg} /> : null}
        </div>
    );
}
