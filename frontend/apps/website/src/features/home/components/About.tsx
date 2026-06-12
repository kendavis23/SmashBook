export function About() {
    return (
        <section id="about" className="py-20 lg:py-28">
            <div className="mx-auto max-w-7xl px-6 lg:px-8">
                <div className="grid gap-14 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
                    <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-cta">
                            Why SmashBook
                        </p>
                        <h2 className="mt-4 text-3xl font-bold leading-[1.1] tracking-tight text-foreground lg:text-5xl">
                            Built for operators who need fewer manual steps and better decisions.
                        </h2>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                        {[
                            {
                                title: "For ownership",
                                body: "See revenue, utilisation, payments, churn risk, and staff activity across every location without waiting for manual reports.",
                            },
                            {
                                title: "For front desk teams",
                                body: "Handle walk-ins, changes, refunds, memberships, and customer questions from a fast operational console.",
                            },
                            {
                                title: "For players",
                                body: "Book courts, join waitlists, manage payments, find matches, and receive timely updates without calling the club.",
                            },
                            {
                                title: "For growth",
                                body: "Use AI-assisted campaigns, demand insights, and player segmentation to turn quiet hours into booked courts.",
                            },
                        ].map((card) => (
                            <div
                                key={card.title}
                                className="rounded-xl border border-border bg-card p-6 shadow-sm transition-shadow duration-200 hover:shadow-md"
                            >
                                <h3 className="text-[15px] font-semibold tracking-tight text-foreground">
                                    {card.title}
                                </h3>
                                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                                    {card.body}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}
