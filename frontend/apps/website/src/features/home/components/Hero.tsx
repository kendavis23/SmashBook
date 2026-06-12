import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

export function Hero() {
    return (
        <section className="relative min-h-[calc(100vh-60px)] overflow-hidden border-b border-border bg-foreground text-white">
            <img
                src="/Image.png"
                alt=""
                aria-hidden="true"
                className="absolute inset-x-0 top-0 h-full w-full object-cover object-[62%_58%]"
            />
            <div
                className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/55 to-black/10"
                aria-hidden="true"
            />
            <div
                className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/5"
                aria-hidden="true"
            />

            {/* Desktop layout */}
            <div className="relative mx-auto hidden max-w-7xl px-8 pt-24 lg:block">
                <div className="max-w-2xl py-20">
                    <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/8 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/60 backdrop-blur-sm">
                        <span className="h-1.5 w-1.5 rounded-full bg-white/40" />
                        Padel Club Management
                    </p>
                    <h1 className="text-5xl font-bold leading-[1.08] tracking-tight text-white sm:text-6xl lg:text-[68px]">
                        Run your padel club from one system.
                    </h1>
                    <p className="mt-7 max-w-xl text-lg leading-8 text-white/70">
                        SmashBook is a multi-tenant SaaS platform for padel club management,
                        handling courts, payments, and the full player journey in one place.
                    </p>
                    <div className="mt-10 flex flex-row gap-3">
                        <Link
                            to="/contact"
                            className="inline-flex items-center justify-center gap-2 rounded-lg border border-white bg-white px-7 py-3.5 text-[15px] font-semibold text-foreground shadow-md transition-all duration-200 hover:bg-white/92 hover:shadow-lg active:scale-[0.98]"
                        >
                            Book a Demo
                            <ArrowRight className="h-4 w-4" />
                        </Link>
                        <Link
                            to="/product"
                            className="inline-flex items-center justify-center rounded-lg border border-white/25 bg-white/8 px-7 py-3.5 text-[15px] font-semibold text-white backdrop-blur-sm transition-all duration-200 hover:bg-white/15 hover:border-white/40 active:scale-[0.98]"
                        >
                            Explore the Product
                        </Link>
                    </div>
                </div>
            </div>

            {/* Mobile layout */}
            <div className="relative flex min-h-[calc(100vh-60px)] flex-col px-6 pt-8 lg:hidden">
                <p className="whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.1em] text-white/50">
                    Built for the AI&#8209;powered padel club
                </p>

                <div className="flex flex-1 flex-col justify-center">
                    <p className="mb-5 inline-flex items-center gap-2 self-start rounded-full border border-white/15 bg-white/8 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-white/60 backdrop-blur-sm">
                        <span className="h-1.5 w-1.5 rounded-full bg-white/40" />
                        Padel Club Management
                    </p>
                    <h1 className="text-[38px] font-bold leading-[1.08] tracking-tight text-white">
                        Run your padel club from one system.
                    </h1>
                    <p className="mt-5 text-base leading-7 text-white/70">
                        SmashBook is a multi-tenant SaaS platform for padel club management,
                        handling courts, payments, and the full player journey in one place.
                    </p>
                </div>

                <div className="mb-28 flex flex-col gap-3">
                    <Link
                        to="/contact"
                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-white bg-white px-7 py-3.5 text-base font-semibold text-foreground shadow-md transition-all duration-200 hover:bg-white/92 active:scale-[0.98]"
                    >
                        Book a Demo
                        <ArrowRight className="h-4 w-4" />
                    </Link>
                    <Link
                        to="/product"
                        className="inline-flex items-center justify-center rounded-lg border border-white/25 bg-white/8 px-7 py-3.5 text-base font-semibold text-white backdrop-blur-sm transition-all duration-200 hover:bg-white/15 active:scale-[0.98]"
                    >
                        Explore the Product
                    </Link>
                </div>
            </div>

            <div
                className="absolute bottom-0 left-0 right-0 h-28 bg-gradient-to-t from-background to-transparent"
                aria-hidden="true"
            />
        </section>
    );
}
