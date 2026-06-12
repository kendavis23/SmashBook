import { Link } from "react-router-dom";

export function CtaSection() {
    return (
        <section className="border-t border-border bg-foreground py-20 lg:py-24">
            <div className="mx-auto max-w-7xl px-6 text-center lg:px-8">
                <h2 className="text-3xl font-bold tracking-tight text-white lg:text-4xl">
                    See SmashBook in action.
                </h2>
                <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-white/65">
                    Book a personalised demo of the player and staff experience, or get in touch to
                    join the early-access programme for your club.
                </p>
                <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
                    <Link
                        to="/contact"
                        className="inline-flex w-full items-center justify-center rounded-lg bg-cta px-7 py-3.5 text-[15px] font-semibold text-cta-foreground shadow-sm transition-all duration-200 hover:bg-cta-hover hover:shadow-md active:scale-[0.98] sm:w-auto"
                    >
                        Book a Demo
                    </Link>
                    <Link
                        to="/pricing"
                        className="inline-flex w-full items-center justify-center rounded-lg border border-white/20 bg-white/8 px-7 py-3.5 text-[15px] font-semibold text-white transition-all duration-200 hover:bg-white/14 hover:border-white/30 active:scale-[0.98] sm:w-auto"
                    >
                        View Pricing
                    </Link>
                </div>
            </div>
        </section>
    );
}
