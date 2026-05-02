const staffDemoUrl = import.meta.env.VITE_API_STAFF_SITE_URL ?? "https://ace-staging.smashbook.app";
const playerDemoUrl = import.meta.env.VITE_API_PLAYER_SITE_URL ?? "https://ace-player-staging.smashbook.app";

export function Hero() {
    return (
        <section className="relative min-h-[calc(100vh-64px)] overflow-hidden border-b border-border bg-foreground text-white">
            <img
                src="/Image.png"
                alt=""
                aria-hidden="true"
                className="absolute inset-x-0 top-0 h-full w-full object-cover object-[62%_58%]"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-black/15" aria-hidden="true" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/10" aria-hidden="true" />

            <div className="relative mx-auto flex min-h-[calc(100vh-64px)] max-w-7xl items-center px-6 lg:px-8">
                <div className="max-w-2xl py-20">
                    <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-white/80 backdrop-blur-sm">
                        <span className="h-1.5 w-1.5 rounded-full bg-white/70" />
                        Padel Club Management
                    </p>
                    <h1 className="text-5xl font-bold leading-[1.1] text-white sm:text-6xl lg:text-7xl">
                        Run your padel club from one system.
                    </h1>

                    <p className="mt-6 max-w-xl text-lg leading-8 text-white/75">
                        SmashBook is a multi-tenant SaaS platform for padel club management, handling courts, payments, and the full player journey in one place.
                    </p>

                    <div className="mt-10 flex flex-col gap-3 sm:flex-row">
                        <a
                            href={playerDemoUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center justify-center rounded-md border border-white bg-white px-7 py-3.5 text-base font-medium text-foreground shadow-sm transition-all duration-150 hover:bg-white/90 active:scale-[0.98]"
                        >
                            Player Demo
                        </a>
                        <a
                            href={staffDemoUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center justify-center rounded-md border border-white/30 bg-white/10 px-7 py-3.5 text-base font-medium text-white shadow-sm backdrop-blur-sm transition-all duration-150 hover:bg-white/18 active:scale-[0.98]"
                        >
                            Staff Demo
                        </a>
                    </div>
                </div>
            </div>

            <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background to-transparent" aria-hidden="true" />
        </section>
    );
}
