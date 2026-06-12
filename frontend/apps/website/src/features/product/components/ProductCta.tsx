import { Link } from "react-router-dom";

export function ProductCta() {
    return (
        <section className="border-t border-border py-16 lg:py-20">
            <div className="mx-auto max-w-7xl px-6 lg:px-8">
                <div className="flex flex-col items-start justify-between gap-6 rounded-xl border border-border bg-card p-8 shadow-sm lg:flex-row lg:items-center">
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight text-foreground">
                            See SmashBook in action.
                        </h2>
                        <p className="mt-2 text-sm leading-6 text-muted-foreground">
                            Book a personalised walkthrough of the player experience and the staff
                            console for your club.
                        </p>
                    </div>
                    <div className="flex flex-col gap-3 sm:flex-row">
                        <Link to="/contact" className="btn-cta px-6 py-3">
                            Book a Demo
                        </Link>
                        <Link to="/pricing" className="btn-outline px-6 py-3">
                            View Pricing
                        </Link>
                    </div>
                </div>
            </div>
        </section>
    );
}
