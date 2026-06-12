import { Link } from "react-router-dom";
import { CONTACT_EMAIL, SITE_TAGLINE } from "../lib/site";

const PRODUCT_LINKS = [
    { label: "Product", to: "/product" },
    { label: "Pricing", to: "/pricing" },
    { label: "Book a demo", to: "/contact" },
];

const COMPANY_LINKS = [
    { label: "About us", to: "/about" },
    { label: "Contact", to: "/contact" },
];

const LEGAL_LINKS = [
    { label: "Privacy Policy", to: "/privacy" },
    { label: "Terms of Service", to: "/terms" },
];

export function Footer() {
    return (
        <footer className="border-t border-border bg-secondary/40">
            <div className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
                <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-5">
                    <div className="sm:col-span-2">
                        <Link
                            to="/"
                            className="inline-block text-[17px] font-bold tracking-tight text-foreground"
                        >
                            Smash<span className="text-cta">Book</span>
                        </Link>
                        <p className="mt-3.5 max-w-xs text-sm leading-6 text-muted-foreground">
                            {SITE_TAGLINE}. One platform for bookings, payments, players, and
                            AI-assisted club operations.
                        </p>
                        <a
                            href={`mailto:${CONTACT_EMAIL}`}
                            className="mt-4 inline-block text-sm font-medium text-cta hover:text-cta-hover transition-colors"
                        >
                            {CONTACT_EMAIL}
                        </a>
                    </div>

                    <div>
                        <h3 className="text-xs font-semibold uppercase tracking-widest text-foreground">
                            Product
                        </h3>
                        <ul className="mt-4 space-y-3">
                            {PRODUCT_LINKS.map((link) => (
                                <li key={link.to}>
                                    <Link
                                        to={link.to}
                                        className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                                    >
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div>
                        <h3 className="text-xs font-semibold uppercase tracking-widest text-foreground">
                            Company
                        </h3>
                        <ul className="mt-4 space-y-3">
                            {COMPANY_LINKS.map((link) => (
                                <li key={link.to}>
                                    <Link
                                        to={link.to}
                                        className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                                    >
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div>
                        <h3 className="text-xs font-semibold uppercase tracking-widest text-foreground">
                            Legal
                        </h3>
                        <ul className="mt-4 space-y-3">
                            {LEGAL_LINKS.map((link) => (
                                <li key={link.to}>
                                    <Link
                                        to={link.to}
                                        className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                                    >
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                <div className="mt-14 flex flex-col gap-2 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-muted-foreground">
                        © 2026 SmashBook. All rights reserved.
                    </p>
                    <p className="text-xs text-muted-foreground/60">
                        Built for the AI-powered padel club.
                    </p>
                </div>
            </div>
        </footer>
    );
}
