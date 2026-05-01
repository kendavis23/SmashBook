export function About() {
    return (
        <section id="about" className="py-20 lg:py-28">
            <div className="mx-auto max-w-7xl px-6 lg:px-8">
                <div className="grid gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
                    <div>
                        <p className="text-sm font-semibold uppercase tracking-widest text-cta">
                            Why SmashBook
                        </p>
                        <h2 className="mt-3 text-3xl font-bold text-foreground lg:text-5xl">
                            Built for operators who need fewer manual steps and better decisions.
                        </h2>
                    </div>
                    <div className="grid gap-6 sm:grid-cols-2">
                        <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
                            <h3 className="text-base font-semibold text-foreground">For ownership</h3>
                            <p className="mt-3 text-sm leading-6 text-muted-foreground">
                                See revenue, utilisation, payments, churn risk, and staff activity across every location without waiting for manual reports.
                            </p>
                        </div>
                        <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
                            <h3 className="text-base font-semibold text-foreground">For front desk teams</h3>
                            <p className="mt-3 text-sm leading-6 text-muted-foreground">
                                Handle walk-ins, changes, refunds, memberships, and customer questions from a fast operational console.
                            </p>
                        </div>
                        <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
                            <h3 className="text-base font-semibold text-foreground">For players</h3>
                            <p className="mt-3 text-sm leading-6 text-muted-foreground">
                                Book courts, join waitlists, manage payments, find matches, and receive timely updates without calling the club.
                            </p>
                        </div>
                        <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
                            <h3 className="text-base font-semibold text-foreground">For growth</h3>
                            <p className="mt-3 text-sm leading-6 text-muted-foreground">
                                Use AI-assisted campaigns, demand insights, and player segmentation to turn quiet hours into booked courts.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
