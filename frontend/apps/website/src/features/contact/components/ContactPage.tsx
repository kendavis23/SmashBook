import { Mail, MonitorPlay } from "lucide-react";
import { usePageTitle } from "../../../layout/usePageTitle";
import { CONTACT_EMAIL } from "../../../lib/site";

export function ContactPage() {
    usePageTitle("Contact");

    return (
        <div>
            <section className="border-b border-border py-20 lg:py-24">
                <div className="mx-auto max-w-7xl px-6 lg:px-8">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-cta">
                        Contact
                    </p>
                    <h1 className="mt-4 max-w-2xl text-4xl font-bold leading-[1.1] tracking-tight text-foreground lg:text-5xl">
                        Get in touch with the SmashBook team.
                    </h1>
                    <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground">
                        Run a padel club and want early access? Have a question about the product,
                        partnerships, or anything else? Email us — we read everything and reply
                        personally.
                    </p>
                </div>
            </section>

            <section className="py-16 lg:py-24">
                <div className="mx-auto max-w-7xl px-6 lg:px-8">
                    <div className="grid gap-5 lg:grid-cols-2">
                        <div className="rounded-xl border border-border bg-card p-8 shadow-sm transition-shadow duration-200 hover:shadow-md">
                            <div className="mb-5 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-cta/8 text-cta">
                                <Mail className="h-5 w-5" />
                            </div>
                            <h2 className="text-xl font-bold tracking-tight text-foreground">
                                Email us
                            </h2>
                            <p className="mt-2 text-sm leading-6 text-muted-foreground">
                                For early access, demos, partnerships, press, or general questions.
                            </p>
                            <a
                                href={`mailto:${CONTACT_EMAIL}`}
                                className="mt-5 inline-block text-[17px] font-semibold text-cta hover:text-cta-hover transition-colors"
                            >
                                {CONTACT_EMAIL}
                            </a>
                            {/* TODO: add company registered address / location here once available,
                                e.g. "SmashBook · City, Country" — reviewers value a physical anchor. */}
                        </div>

                        <div className="rounded-xl border border-border bg-card p-8 shadow-sm transition-shadow duration-200 hover:shadow-md">
                            <div className="mb-5 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-cta/8 text-cta">
                                <MonitorPlay className="h-5 w-5" />
                            </div>
                            <h2 className="text-xl font-bold tracking-tight text-foreground">
                                Book a demo
                            </h2>
                            <p className="mt-2 text-sm leading-6 text-muted-foreground">
                                We&apos;ll walk you through both sides of the platform — the player
                                experience and the staff console — in a session tailored to your
                                club.
                            </p>
                            <a
                                href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("SmashBook demo request")}`}
                                className="mt-6 inline-flex items-center justify-center rounded-lg bg-cta px-6 py-3 text-sm font-semibold text-cta-foreground shadow-sm transition-all duration-200 hover:bg-cta-hover hover:shadow-md active:scale-[0.98]"
                            >
                                Book a Demo
                            </a>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
