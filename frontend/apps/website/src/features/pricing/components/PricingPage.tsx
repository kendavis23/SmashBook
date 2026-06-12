import { Link } from "react-router-dom";
import { Check } from "lucide-react";
import { usePageTitle } from "../../../layout/usePageTitle";

/*
 * Pricing is intentionally published without fixed amounts: SmashBook is in
 * early access and pricing is finalised with the first partner clubs.
 * TODO: replace "Early-access pricing" with real plan prices once set.
 */
const PLANS = [
    {
        name: "Starter",
        audience: "For a single club getting started",
        features: [
            "One club, online court booking",
            "Player payments & wallet (Stripe)",
            "Staff console & roles",
            "Player web app & mobile app",
            "Email notifications",
        ],
        highlighted: false,
    },
    {
        name: "Growth",
        audience: "For clubs ready to automate operations",
        features: [
            "Everything in Starter",
            "AI dynamic pricing & smart matchmaking",
            "AI-enabled CRM & retention campaigns",
            "Analytics dashboards & reports",
            "Tournaments & memberships",
        ],
        highlighted: true,
    },
    {
        name: "Scale",
        audience: "For multi-club organisations",
        features: [
            "Everything in Growth",
            "Multiple clubs under one organisation",
            "Cross-club analytics & exports",
            "Advanced roles & permissions",
            "Priority support & onboarding",
        ],
        highlighted: false,
    },
];

export function PricingPage() {
    usePageTitle("Pricing");

    return (
        <div>
            <section className="border-b border-border py-20 lg:py-24">
                <div className="mx-auto max-w-7xl px-6 text-center lg:px-8">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-cta">
                        Pricing
                    </p>
                    <h1 className="mt-4 text-4xl font-bold leading-[1.1] tracking-tight text-foreground lg:text-5xl">
                        Simple subscription pricing per club.
                    </h1>
                    <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-muted-foreground">
                        SmashBook is a subscription SaaS — clubs pay a monthly plan based on the
                        features and number of clubs they run. We&apos;re currently in early access,
                        and pricing is finalised together with our first partner clubs.
                    </p>
                </div>
            </section>

            <section className="py-16 lg:py-24">
                <div className="mx-auto max-w-7xl px-6 lg:px-8">
                    <div className="grid gap-5 lg:grid-cols-3">
                        {PLANS.map((plan) => (
                            <div
                                key={plan.name}
                                className={`relative flex flex-col rounded-xl border bg-card p-8 shadow-sm transition-shadow duration-200 hover:shadow-md ${
                                    plan.highlighted
                                        ? "border-cta ring-1 ring-cta"
                                        : "border-border"
                                }`}
                            >
                                {plan.highlighted && (
                                    <p className="mb-4 self-start rounded-full bg-cta/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-cta">
                                        Most popular
                                    </p>
                                )}
                                <h2 className="text-xl font-bold tracking-tight text-foreground">
                                    {plan.name}
                                </h2>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    {plan.audience}
                                </p>
                                <div className="mt-6 border-t border-border pt-6">
                                    <p className="text-xl font-bold text-foreground">
                                        Early-access pricing
                                    </p>
                                    <p className="mt-0.5 text-sm text-muted-foreground">
                                        Contact us for a quote
                                    </p>
                                </div>
                                <ul className="mt-6 flex-1 space-y-3">
                                    {plan.features.map((feature) => (
                                        <li key={feature} className="flex gap-3">
                                            <Check className="mt-0.5 h-4 w-4 shrink-0 text-cta" />
                                            <span className="text-sm leading-6 text-muted-foreground">
                                                {feature}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                                <Link
                                    to="/contact"
                                    className={`mt-8 ${plan.highlighted ? "btn-cta" : "btn-outline"} w-full px-6 py-3`}
                                >
                                    Contact us
                                </Link>
                            </div>
                        ))}
                    </div>

                    <p className="mt-10 text-center text-sm text-muted-foreground">
                        Player payments are processed through Stripe; standard payment processing
                        fees apply. Early-access partner clubs help shape the product and receive
                        preferential launch pricing.
                    </p>
                </div>
            </section>
        </div>
    );
}
