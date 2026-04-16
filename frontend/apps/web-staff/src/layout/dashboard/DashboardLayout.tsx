import { useAuth, useAuthStore, useInitAuth } from "@repo/auth";
import { useListClubs } from "@repo/staff-domain/hooks";
import { Outlet, useNavigate } from "@tanstack/react-router";
import type { JSX } from "react";
import { useEffect, useState } from "react";

import Navbar from "./Navbar";
import Sidebar from "./Sidebar";

export default function DashboardLayout(): JSX.Element {
    const { isLoading, isError } = useInitAuth();
    const accessToken = useAuthStore((s) => s.accessToken);
    const activeClubId = useAuthStore((s) => s.activeClubId);
    const setActiveClubId = useAuthStore((s) => s.setActiveClubId);
    const navigate = useNavigate();
    const [mobileOpen, setMobileOpen] = useState(false);

    const { role, clubs: jwtClubs } = useAuth();
    const isOwner = role === "owner";

    // Owners fetch the full club list from the API.
    // Non-owners use the clubs array already present in the login response (JWT clubs).
    const { data: apiClubs = [], isLoading: isClubsLoading } = useListClubs({ enabled: isOwner });
    const clubs = isOwner ? apiClubs : jwtClubs.map((c) => ({ id: c.club_id, name: c.club_name }));

    // Auto-select the first club for all roles when none is set yet
    useEffect(() => {
        if (!activeClubId && clubs.length > 0) {
            const first = clubs[0];
            if (first) {
                setActiveClubId(first.id, first.name);
            }
        }
    }, [activeClubId, clubs, setActiveClubId]);

    useEffect(() => {
        if (!isLoading && (!accessToken || isError)) {
            void navigate({ to: "/login" });
        }
    }, [isLoading, accessToken, isError, navigate]);

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center bg-background">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-cta" />
            </div>
        );
    }

    if (!accessToken || isError) {
        return <></>;
    }

    return (
        /* Root shell: sidebar on the left, content column on the right */
        <div className="flex h-screen overflow-hidden bg-background text-foreground">
            <Sidebar mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />

            {/* Right column — navbar + scrollable content */}
            <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
                <header
                    className="sticky top-0 z-20 flex h-[var(--nav-height)] flex-shrink-0
                        items-center border-b border-border bg-background px-5"
                >
                    <Navbar
                        mobileOpen={mobileOpen}
                        onOpenMobile={() => setMobileOpen(true)}
                        clubs={clubs}
                        isClubsLoading={isClubsLoading}
                    />
                </header>

                <main className="flex-1 overflow-y-auto bg-muted/30">
                    <div className="w-full p-[var(--page-padding)]">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
}
