import { Breadcrumb } from "@repo/ui";
import { LayoutDashboard } from "lucide-react";
import type { JSX } from "react";

export default function DashboardView(): JSX.Element {
    return (
        <div className="w-full space-y-5">
            <Breadcrumb items={[{ label: "Dashboard" }]} />
            <section className="card-surface overflow-hidden">
                <header className="flex flex-row items-center gap-3 border-b border-border bg-muted/10 px-5 py-4 sm:px-6">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary text-secondary-foreground shadow-xs">
                        <LayoutDashboard size={16} />
                    </div>
                    <div className="min-w-0">
                        <h1 className="text-lg font-semibold tracking-tight text-foreground">
                            Dashboard
                        </h1>
                        <p className="mt-0.5 text-sm text-muted-foreground">
                            Your club at a glance.
                        </p>
                    </div>
                </header>

                <div className="flex flex-col items-center justify-center gap-4 px-6 py-24 text-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/50">
                        <LayoutDashboard size={24} className="text-muted-foreground/40" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-foreground">Coming soon</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                            Your personalised dashboard is on its way.
                        </p>
                    </div>
                </div>
            </section>
        </div>
    );
}
