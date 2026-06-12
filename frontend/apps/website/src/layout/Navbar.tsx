import { useState, useEffect } from "react";
import { Link, NavLink } from "react-router-dom";
import { Menu, X } from "lucide-react";

const NAV_LINKS = [
    { label: "Product", to: "/product" },
    { label: "Pricing", to: "/pricing" },
    { label: "About", to: "/about" },
    { label: "Contact", to: "/contact" },
];

export function Navbar() {
    const [mobileOpen, setMobileOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 8);
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    return (
        <header
            className={`fixed inset-x-0 top-0 z-[9999] border-b transition-all duration-300 ${
                scrolled
                    ? "border-border/80 bg-white/95 shadow-sm backdrop-blur-md"
                    : "border-transparent bg-white/90 backdrop-blur-sm"
            }`}
        >
            <div className="mx-auto max-w-7xl px-6 lg:px-8">
                <div className="flex h-[60px] items-center justify-between">
                    <Link to="/" className="flex items-center gap-2 shrink-0">
                        <span className="text-[17px] font-bold tracking-tight text-foreground">
                            Smash<span className="text-cta">Book</span>
                        </span>
                    </Link>

                    <nav className="hidden items-center gap-1 md:flex">
                        {NAV_LINKS.map((link) => (
                            <NavLink
                                key={link.to}
                                to={link.to}
                                className={({ isActive }) =>
                                    `rounded-lg px-3.5 py-2 text-sm font-medium transition-all duration-150 ${
                                        isActive
                                            ? "bg-accent text-foreground"
                                            : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                                    }`
                                }
                            >
                                {link.label}
                            </NavLink>
                        ))}
                    </nav>

                    <div className="hidden items-center gap-3 md:flex">
                        <Link to="/contact" className="btn-cta px-4 py-2 text-sm">
                            Book a Demo
                        </Link>
                    </div>

                    <button
                        className="md:hidden flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                        onClick={() => setMobileOpen((v) => !v)}
                        aria-label="Toggle menu"
                    >
                        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                    </button>
                </div>
            </div>

            {mobileOpen && (
                <div className="md:hidden border-t border-border/60 bg-white/98 px-6 py-4">
                    <nav className="flex flex-col gap-1">
                        {NAV_LINKS.map((link) => (
                            <NavLink
                                key={link.to}
                                to={link.to}
                                onClick={() => setMobileOpen(false)}
                                className={({ isActive }) =>
                                    `rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                                        isActive
                                            ? "bg-accent text-foreground"
                                            : "text-muted-foreground hover:text-foreground hover:bg-accent/60"
                                    }`
                                }
                            >
                                {link.label}
                            </NavLink>
                        ))}
                        <div className="mt-3 pt-3 border-t border-border/60">
                            <Link
                                to="/contact"
                                onClick={() => setMobileOpen(false)}
                                className="btn-cta w-full"
                            >
                                Book a Demo
                            </Link>
                        </div>
                    </nav>
                </div>
            )}
        </header>
    );
}
