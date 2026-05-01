import { useState } from "react";
import { Menu, X } from "lucide-react";

const NAV_LINKS = [
    { label: "Features", href: "#features" },
    { label: "About", href: "#about" },
];

export function Navbar() {
    const [mobileOpen, setMobileOpen] = useState(false);

    return (
        <header className="fixed inset-x-0 top-0 z-[9999] border-b border-border bg-white shadow-sm">
            <div className="mx-auto max-w-7xl px-6 lg:px-8">
                <div className="flex h-16 items-center justify-between">
                    <a href="/" className="flex items-center gap-2 shrink-0">
                        <span className="text-lg font-bold text-foreground">
                            Smash<span className="text-cta">Book</span>
                        </span>
                    </a>

                    <nav className="hidden items-center gap-7 md:flex">
                        {NAV_LINKS.map((link) => (
                            <a
                                key={link.href}
                                href={link.href}
                                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                            >
                                {link.label}
                            </a>
                        ))}
                    </nav>

                    <button
                        className="md:hidden flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
                        onClick={() => setMobileOpen((v) => !v)}
                        aria-label="Toggle menu"
                    >
                        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                    </button>
                </div>
            </div>

            {mobileOpen && (
                <div className="md:hidden border-t border-border bg-white px-6 py-4 shadow-sm">
                    <nav className="flex flex-col gap-3">
                        {NAV_LINKS.map((link) => (
                            <a
                                key={link.href}
                                href={link.href}
                                onClick={() => setMobileOpen(false)}
                                className="text-sm font-medium text-muted-foreground hover:text-foreground"
                            >
                                {link.label}
                            </a>
                        ))}
                    </nav>
                </div>
            )}
        </header>
    );
}
