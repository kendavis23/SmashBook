import { BarChart3, Bell, CalendarDays, CreditCard, ShieldCheck, Users } from "lucide-react";

const FEATURES = [
    {
        icon: CalendarDays,
        title: "Real-time court inventory",
        description:
            "Publish courts, memberships, availability windows, and blackout rules with conflict prevention across staff and player apps.",
    },
    {
        icon: CreditCard,
        title: "Payments without chasing",
        description:
            "Collect deposits, subscriptions, refunds, wallets, and invoices with clean reconciliation for each club location.",
    },
    {
        icon: Users,
        title: "Player lifecycle CRM",
        description:
            "Track profiles, levels, booking history, attendance, memberships, and segments for smarter retention work.",
    },
    {
        icon: BarChart3,
        title: "Operator analytics",
        description:
            "Monitor utilisation, revenue mix, no-shows, churn signals, peak demand, and underperforming time slots.",
    },
    {
        icon: Bell,
        title: "Automated engagement",
        description:
            "Send reminders, reactivation campaigns, waitlist updates, and fill-the-court nudges through the right channel.",
    },
    {
        icon: ShieldCheck,
        title: "Secure multi-club control",
        description:
            "Run multiple venues with role-based access, tenant isolation, audit-friendly records, and reliable permissions.",
    },
];

export function Features() {
    return (
        <section id="features" className="bg-background py-24 lg:py-32">
            <div className="mx-auto max-w-7xl px-6 lg:px-8">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                    <div className="max-w-xl">
                        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-cta/20 bg-cta/5 px-3 py-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-cta" />
                            <p className="text-xs font-semibold uppercase tracking-widest text-cta">
                                Platform
                            </p>
                        </div>
                        <h2 className="text-4xl font-bold leading-tight text-foreground lg:text-5xl">
                            One operating layer
                            <br className="hidden sm:block" /> for the entire club.
                        </h2>
                    </div>
                    <p className="max-w-md text-base leading-7 text-muted-foreground lg:pb-1 lg:text-right">
                        Replace fragmented tools with a single system for front desk teams, owners,
                        coaches, finance, and players. Every team works from the same source of
                        truth.
                    </p>
                </div>

                <div className="mt-14 grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
                    {FEATURES.map((feature) => {
                        const Icon = feature.icon;
                        return (
                            <div
                                key={feature.title}
                                className="group bg-card p-6 transition-colors hover:bg-background"
                            >
                                <div className="mb-5 inline-flex h-10 w-10 items-center justify-center rounded-md bg-cta/10 text-cta transition-colors group-hover:bg-cta group-hover:text-cta-foreground">
                                    <Icon className="h-5 w-5" />
                                </div>
                                <h3 className="text-base font-semibold text-foreground">
                                    {feature.title}
                                </h3>
                                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                                    {feature.description}
                                </p>
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
