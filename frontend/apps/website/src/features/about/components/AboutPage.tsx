import { Link } from "react-router-dom";
import { usePageTitle } from "../../../layout/usePageTitle";

/*
 * TODO (before deploying / re-applying to Google for Startups):
 * Replace each placeholder card below with real founder/team details —
 * full name, role, a short bio (background & relevant experience), and a photo.
 * Reviewers specifically look for "the team behind the business" on the website.
 */
const TEAM = [
    {
        name: "Ken Davis",
        role: "Founder & CEO",
        bio: "Focused on building the next generation of sports technology through AI-powered software, analytics, automation, and scalable digital platforms for modern clubs.",
    },
    {
        name: "Rohit Bhamore",
        role: "Founding Engineer",
        bio: "Software engineer focused on building scalable SaaS platforms, modern user experiences, cloud infrastructure, and high-performance products.",
    },
];

const MILESTONES = [
    {
        period: "The problem",
        text: "Padel is one of the fastest-growing sports in the world, but many clubs still rely on spreadsheets, phone calls, and disconnected tools that create operational overhead and limit growth.",
    },
    {
        period: "What we're building",
        text: "A modern all-in-one platform for clubs — managing bookings, payments, players, staff, tournaments, CRM, and analytics — with AI helping automate daily operations and improve the player experience.",
    },
    {
        period: "Why it matters",
        text: "Modern sports clubs need more than scheduling software. SmashBook helps clubs operate smarter with AI-driven insights, automation, analytics, and a connected digital experience built for the next generation of sports communities.",
    },
];

export function AboutPage() {
    usePageTitle("About us");

    return (
        <div>
            <section className="border-b border-border bg-foreground py-20 text-white lg:py-28">
                <div className="mx-auto max-w-7xl px-6 lg:px-8">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/50">
                        About us
                    </p>

                    <h1 className="mt-5 max-w-5xl text-4xl font-bold leading-[1.06] tracking-tight text-white lg:text-7xl">
                        Building the modern operating system for padel clubs.
                    </h1>

                    <p className="mt-8 max-w-3xl text-lg leading-8 text-white/65 lg:text-xl">
                        SmashBook combines AI, analytics, automation, and modern cloud technology
                        into one connected platform — helping clubs manage operations, engage
                        players, streamline payments, and grow smarter.
                    </p>
                </div>
            </section>

            <section className="py-20 lg:py-28">
                <div className="mx-auto max-w-7xl px-6 lg:px-8">
                    <h2 className="text-3xl font-bold tracking-tight text-foreground lg:text-4xl">
                        Our story
                    </h2>
                    <div className="mt-10 grid gap-5 lg:grid-cols-3">
                        {MILESTONES.map((item) => (
                            <div
                                key={item.period}
                                className="rounded-xl border border-border bg-card p-7 shadow-sm"
                            >
                                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-cta">
                                    {item.period}
                                </p>
                                <p className="mt-3.5 text-sm leading-6 text-muted-foreground">
                                    {item.text}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section className="border-y border-border bg-secondary/30 py-20 lg:py-28">
                <div className="mx-auto max-w-7xl px-6 lg:px-8">
                    <h2 className="text-3xl font-bold tracking-tight text-foreground lg:text-4xl">
                        The team
                    </h2>
                    <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
                        SmashBook is built by a small founding team of engineers and operators.
                    </p>
                    <div className="mt-10 grid gap-5 sm:grid-cols-2">
                        {TEAM.map((member) => (
                            <div
                                key={member.name}
                                className="rounded-xl border border-border bg-card p-7 shadow-sm"
                            >
                                <div className="mb-1 flex items-center gap-3">
                                    <div>
                                        <h3 className="text-[15px] font-semibold tracking-tight text-foreground">
                                            {member.name}
                                        </h3>
                                        <p className="text-xs font-medium text-cta">
                                            {member.role}
                                        </p>
                                    </div>
                                </div>
                                <p className="mt-4 text-sm leading-6 text-muted-foreground">
                                    {member.bio}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section className="py-16 lg:py-20">
                <div className="mx-auto max-w-7xl px-6 lg:px-8">
                    <div className="flex flex-col items-start justify-between gap-6 rounded-xl border border-border bg-card p-8 shadow-sm lg:flex-row lg:items-center">
                        <div>
                            <h2 className="text-2xl font-bold tracking-tight text-foreground">
                                Want to talk to us?
                            </h2>
                            <p className="mt-2 text-sm leading-6 text-muted-foreground">
                                Whether you run a club or just want to learn more, we&apos;d love to
                                hear from you.
                            </p>
                        </div>
                        <Link to="/contact" className="btn-cta shrink-0 px-6 py-3">
                            Contact us
                        </Link>
                    </div>
                </div>
            </section>
        </div>
    );
}
