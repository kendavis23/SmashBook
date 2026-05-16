import { Outlet } from "@tanstack/react-router";
import type { JSX } from "react";
import { useState } from "react";

import Navbar from "./Navbar";
import Sidebar from "./Sidebar";

export default function DashboardLayout(): JSX.Element {
    const [mobileOpen, setMobileOpen] = useState(false);

    return (
        <div className="flex h-dvh max-h-dvh overflow-hidden bg-background text-foreground">
            <Sidebar mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />

            <div className="flex min-h-0 min-w-0 flex-1 flex-col">
                <header
                    className="sticky top-0 z-30 flex h-[var(--nav-height)] flex-shrink-0
                        items-center border-b border-border bg-background px-5"
                >
                    <Navbar mobileOpen={mobileOpen} onOpenMobile={() => setMobileOpen(true)} />
                </header>

                <main className="min-h-0 flex-1 overflow-y-auto bg-muted/30">
                    <div className="w-full p-[var(--page-padding)]">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
}
