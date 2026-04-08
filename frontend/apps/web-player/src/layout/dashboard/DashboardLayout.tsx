import { useAuthStore, useInitAuth } from "@repo/auth";
import { Outlet, useNavigate } from "@tanstack/react-router";
import type { JSX } from "react";
import { useEffect, useState } from "react";

import Navbar from "./Navbar";
import Sidebar from "./Sidebar";

export default function DashboardLayout(): JSX.Element {
    const { isLoading, isError } = useInitAuth();
    const accessToken = useAuthStore((s) => s.accessToken);
    const navigate = useNavigate();
    const [mobileOpen, setMobileOpen] = useState(false);

    useEffect(() => {
        if (!isLoading && (!accessToken || isError)) {
            void navigate({ to: "/login" });
        }
    }, [isLoading, accessToken, isError, navigate]);

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center bg-background">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-border border-t-blue-600" />
            </div>
        );
    }

    if (!accessToken || isError) {
        return <></>;
    }

    return (
        <div className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
            {/* Navbar — full width */}
            <header className="sticky top-0 z-20 flex h-[62px] flex-shrink-0 items-center border-b border-primary/20 bg-background px-5">
                <Navbar mobileOpen={mobileOpen} onOpenMobile={() => setMobileOpen(true)} />
            </header>

            {/* Sidebar + Content */}
            <div className="flex flex-1 overflow-hidden ">
                <Sidebar mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />

                <main className="flex-1 overflow-y-auto bg-primary/5 p-6">
                    <div className="w-full">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
}
