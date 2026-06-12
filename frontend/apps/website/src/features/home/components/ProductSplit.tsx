const PLAYER_FEATURES = [
    {
        title: "Intuitive Booking",
        description:
            "Modern, mobile-first flow players actually enjoy — fast booking, frictionless payments.",
    },
    {
        title: "Smart Matchmaking",
        description:
            "AI pairs players by level and availability so games fill faster and play stays competitive.",
    },
    {
        title: "One Integrated App",
        description:
            "Booking, payments, messaging and history in a single experience — not stitched-together tools.",
    },
];

const STAFF_FEATURES = [
    {
        title: "Feature-Rich Staff Console",
        description:
            "Bookings, court ops, comms, tournaments, payments and rosters in one place for the team running the club.",
    },
    {
        title: "AI-Enabled CRM",
        description:
            "Player segmentation, automated outreach, and retention campaigns generated from real club data.",
    },
    {
        title: "AI Operations",
        description:
            "Smart scheduling, dynamic pricing and an operator copilot that automates the admin grind.",
    },
    {
        title: "AI Dashboards",
        description:
            "Live utilisation, revenue, churn and cohort insights — surface what to optimise next.",
    },
];

function FeatureList({ items, dotClass }: { items: typeof PLAYER_FEATURES; dotClass: string }) {
    return (
        <ul className="mt-7 space-y-5">
            {items.map((item) => (
                <li key={item.title} className="flex gap-4">
                    <span
                        className={`mt-[7px] h-2 w-2 shrink-0 rounded-full ${dotClass}`}
                        aria-hidden="true"
                    />
                    <div>
                        <h4 className="text-[15px] font-semibold tracking-tight text-foreground">
                            {item.title}
                        </h4>
                        <p className="mt-1 text-sm leading-6 text-muted-foreground">
                            {item.description}
                        </p>
                    </div>
                </li>
            ))}
        </ul>
    );
}

export function ProductSplit() {
    return (
        <section className="border-y border-border bg-secondary/30 py-24 lg:py-32">
            <div className="mx-auto max-w-7xl px-6 lg:px-8">
                <div className="max-w-none">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-cta">
                        Product features
                    </p>
                    <h2 className="mt-4 text-3xl font-bold leading-[1.1] tracking-tight text-foreground lg:text-5xl">
                        Your club, your players, your data.
                    </h2>
                </div>

                <div className="mt-14 grid gap-6 lg:grid-cols-2">
                    <div className="rounded-xl border border-border bg-card p-8 shadow-sm">
                        <div className="inline-flex rounded-lg bg-warning/12 border border-warning/20 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.1em] text-warning">
                            For players
                        </div>
                        <p className="mt-4 text-sm italic text-muted-foreground">
                            Frictionless experience that drives repeat play
                        </p>
                        <FeatureList items={PLAYER_FEATURES} dotClass="bg-warning" />
                    </div>

                    <div className="rounded-xl border border-border bg-card p-8 shadow-sm">
                        <div className="inline-flex rounded-lg bg-primary/8 border border-primary/15 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.1em] text-primary">
                            For staff
                        </div>
                        <p className="mt-4 text-sm italic text-muted-foreground">
                            Everything operators need to run the club
                        </p>
                        <FeatureList items={STAFF_FEATURES} dotClass="bg-primary" />
                    </div>
                </div>
            </div>
        </section>
    );
}
