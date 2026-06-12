import {
    BarChart3,
    Bot,
    Brain,
    CalendarDays,
    Cloud,
    CreditCard,
    LineChart,
    MessageSquare,
    Smartphone,
    Sparkles,
    Trophy,
    Users,
} from "lucide-react";
import { usePageTitle } from "../../../layout/usePageTitle";
import { ProductCta } from "./ProductCta";

const MODULES = [
    {
        icon: CalendarDays,
        title: "Booking engine",
        description:
            "Real-time court availability, conflict prevention, waitlists, and calendar reservations across staff and player apps.",
    },
    {
        icon: CreditCard,
        title: "Payments & wallet",
        description:
            "Card payments, deposits, refunds, player wallets, and invoices powered by Stripe — with clean per-club reconciliation.",
    },
    {
        icon: Users,
        title: "Player CRM & memberships",
        description:
            "Player profiles, levels, booking history, membership plans with perks, and the full player lifecycle in one record.",
    },
    {
        icon: Trophy,
        title: "Tournaments & matches",
        description:
            "Tournament scheduling, registrations, match results, and skill ratings built directly into the booking system.",
    },
    {
        icon: MessageSquare,
        title: "Messaging & support",
        description:
            "Player↔club messaging, support inbox, booking reminders, and campaign delivery through email and push.",
    },
    {
        icon: BarChart3,
        title: "Analytics & reporting",
        description:
            "Court utilisation, revenue mix, peak demand, churn signals, and exports — across one club or an entire group.",
    },
];

const AI_CAPABILITIES = [
    {
        icon: LineChart,
        title: "Dynamic pricing",
        description:
            "Demand-aware price suggestions per court and time slot, with a deterministic rule-based fallback always in place.",
    },
    {
        icon: Sparkles,
        title: "Smart matchmaking",
        description:
            "Vector-similarity search over player profiles pairs players by level and availability to fill open court slots.",
    },
    {
        icon: Brain,
        title: "Churn & demand prediction",
        description:
            "Engagement scoring, cancellation prediction, and demand forecasting that tell operators where to act next.",
    },
    {
        icon: Bot,
        title: "AI-drafted communication",
        description:
            "Re-engagement drafts, notification copy, and campaign content generated from real club data — reviewed by staff before sending.",
    },
];

const CLOUD_STACK = [
    { name: "Cloud Run", detail: "API and async workers" },
    { name: "Cloud SQL (PostgreSQL + pgvector)", detail: "Multi-tenant data and vector search" },
    { name: "Pub/Sub", detail: "Event-driven AI and notification pipelines" },
    { name: "Vertex AI", detail: "Forecasting, scoring, and classification models" },
    { name: "Anthropic Claude", detail: "Natural-language generation" },
    { name: "Stripe Connect", detail: "Club payments and payouts" },
];

const APPS = [
    {
        icon: Smartphone,
        title: "Player app — web & mobile",
        description:
            "Court discovery, booking, payments, matchmaking, and messaging for players, on the web and as a native mobile app.",
    },
    {
        icon: Users,
        title: "Staff portal",
        description:
            "The operational console for front desk, coaches, and managers — bookings, payments, players, and club settings.",
    },
    {
        icon: BarChart3,
        title: "Owner & admin views",
        description:
            "Multi-club oversight with role-based access, analytics dashboards, and subscription management.",
    },
];

export function ProductPage() {
    usePageTitle("Product");

    return (
        <div>
            <section className="border-b border-border bg-foreground py-20 text-white lg:py-28">
                <div className="mx-auto max-w-7xl px-6 lg:px-8">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-white/50">
                        The platform
                    </p>
                    <h1 className="mt-5 max-w-3xl text-4xl font-bold leading-[1.08] tracking-tight lg:text-6xl">
                        Built for the AI-Powered Padel Club.
                    </h1>
                    <p className="mt-6 max-w-2xl text-lg leading-8 text-white/65">
                        SmashBook is a multi-tenant SaaS platform that runs the entire padel club —
                        bookings, payments, players, staff, tournaments, and analytics — with an AI
                        layer that automates pricing, retention, and operations.
                    </p>
                </div>
            </section>

            <section className="py-20 lg:py-28">
                <div className="mx-auto max-w-7xl px-6 lg:px-8">
                    <h2 className="text-3xl font-bold tracking-tight text-foreground lg:text-4xl">
                        Core platform modules
                    </h2>
                    <div className="mt-10 grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
                        {MODULES.map((item) => {
                            const Icon = item.icon;
                            return (
                                <div
                                    key={item.title}
                                    className="group bg-card p-7 transition-colors duration-200 hover:bg-secondary/60"
                                >
                                    <div className="mb-5 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-cta/8 text-cta transition-all duration-200 group-hover:bg-cta group-hover:text-cta-foreground">
                                        <Icon className="h-5 w-5" />
                                    </div>
                                    <h3 className="text-[15px] font-semibold tracking-tight text-foreground">
                                        {item.title}
                                    </h3>
                                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                                        {item.description}
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>

            <section className="border-y border-border bg-secondary/30 py-20 lg:py-28">
                <div className="mx-auto max-w-7xl px-6 lg:px-8">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-cta">
                        The AI layer
                    </p>
                    <h2 className="mt-4 max-w-2xl text-3xl font-bold leading-[1.1] tracking-tight text-foreground lg:text-4xl">
                        AI that runs club operations, not just a chatbot.
                    </h2>
                    <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
                        Every AI feature ships with a non-AI fallback, per-club feature flags, and
                        full inference logging — so clubs stay in control. Capabilities are rolling
                        out progressively through our early-access programme.
                    </p>
                    <div className="mt-10 grid gap-5 sm:grid-cols-2">
                        {AI_CAPABILITIES.map((item) => {
                            const Icon = item.icon;
                            return (
                                <div
                                    key={item.title}
                                    className="rounded-xl border border-border bg-card p-7 shadow-sm transition-shadow duration-200 hover:shadow-md"
                                >
                                    <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-cta/8 text-cta">
                                        <Icon className="h-5 w-5" />
                                    </div>
                                    <h3 className="text-[15px] font-semibold tracking-tight text-foreground">
                                        {item.title}
                                    </h3>
                                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                                        {item.description}
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>

            <section className="border-t border-border bg-secondary/30 py-20 lg:py-28">
                <div className="mx-auto max-w-7xl px-6 lg:px-8">
                    <h2 className="text-3xl font-bold tracking-tight text-foreground lg:text-4xl">
                        One platform, three surfaces.
                    </h2>
                    <div className="mt-10 grid gap-5 lg:grid-cols-3">
                        {APPS.map((item) => {
                            const Icon = item.icon;
                            return (
                                <div
                                    key={item.title}
                                    className="rounded-xl border border-border bg-card p-7 shadow-sm transition-shadow duration-200 hover:shadow-md"
                                >
                                    <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-cta/8 text-cta">
                                        <Icon className="h-5 w-5" />
                                    </div>
                                    <h3 className="text-[15px] font-semibold tracking-tight text-foreground">
                                        {item.title}
                                    </h3>
                                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                                        {item.description}
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>

            <ProductCta />
        </div>
    );
}
