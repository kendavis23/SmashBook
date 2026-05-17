import { useAuth, useAuthStore } from "@repo/auth";
import { useNavigate } from "@tanstack/react-router";
import { Menu, Search } from "lucide-react";
import type { JSX, KeyboardEvent as ReactKeyboardEvent } from "react";
import { useEffect, useRef, useState } from "react";

import { getSearchableRoutes } from "../../config/routeConfig";

interface NavbarProps {
    mobileOpen?: boolean;
    onOpenMobile?: () => void;
}

export default function Navbar({
    mobileOpen = false,
    onOpenMobile = () => {},
}: NavbarProps): JSX.Element {
    const [searchQuery, setSearchQuery] = useState("");
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [activeSearchIndex, setActiveSearchIndex] = useState(0);
    const searchRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const navigate = useNavigate();

    const { role } = useAuth();
    useAuthStore((state) => state.user);
    const searchResults = getSearchableRoutes(role ?? undefined).filter((route) =>
        route.label.toLowerCase().includes(searchQuery.trim().toLowerCase())
    );
    const showSearchResults =
        isSearchOpen && searchQuery.trim().length > 0 && searchResults.length > 0;
    const searchShortcutLabel =
        typeof navigator !== "undefined" && navigator.userAgent.toLowerCase().includes("mac")
            ? "Cmd + K"
            : "Ctrl + K";

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent): void => {
            if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
                setIsSearchOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        const handleGlobalSearchShortcut = (event: KeyboardEvent): void => {
            if (event.key.toLowerCase() !== "k" || (!event.metaKey && !event.ctrlKey)) {
                return;
            }

            const target = event.target as HTMLElement | null;
            const isTypingTarget =
                target instanceof HTMLInputElement ||
                target instanceof HTMLTextAreaElement ||
                target instanceof HTMLSelectElement ||
                target?.isContentEditable;

            if (isTypingTarget && target !== searchInputRef.current) {
                return;
            }

            event.preventDefault();
            setIsSearchOpen(true);
            searchInputRef.current?.focus();
            searchInputRef.current?.select();
        };

        window.addEventListener("keydown", handleGlobalSearchShortcut);
        return () => window.removeEventListener("keydown", handleGlobalSearchShortcut);
    }, []);

    const handleSearchChange = (value: string): void => {
        setSearchQuery(value);
        setIsSearchOpen(true);
        setActiveSearchIndex(0);
    };

    const handleSearchSelect = (path: string): void => {
        setSearchQuery("");
        setIsSearchOpen(false);
        setActiveSearchIndex(0);
        void navigate({ to: path });
    };

    const handleSearchKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>): void => {
        if (searchResults.length === 0) {
            if (event.key === "Escape") setIsSearchOpen(false);
            return;
        }

        if (event.key === "ArrowDown") {
            event.preventDefault();
            setIsSearchOpen(true);
            setActiveSearchIndex((current) => (current + 1) % searchResults.length);
            return;
        }

        if (event.key === "ArrowUp") {
            event.preventDefault();
            setIsSearchOpen(true);
            setActiveSearchIndex((current) =>
                current === 0 ? searchResults.length - 1 : current - 1
            );
            return;
        }

        if (event.key === "Enter") {
            event.preventDefault();
            const selectedRoute = searchResults[activeSearchIndex];
            if (selectedRoute?.path) handleSearchSelect(selectedRoute.path);
            return;
        }

        if (event.key === "Escape") setIsSearchOpen(false);
    };

    return (
        <div className="flex w-full items-center gap-2">
            <button
                onClick={onOpenMobile}
                aria-label="Open menu"
                className={`flex-shrink-0 items-center justify-center rounded-md
                border border-border bg-transparent text-foreground/60 h-7 w-7
                transition-all duration-150 hover:bg-accent hover:text-foreground md:hidden
                ${mobileOpen ? "pointer-events-none opacity-0" : "flex"}`}
            >
                <Menu size={15} />
            </button>

            <div ref={searchRef} className="relative w-48 sm:w-72 md:w-96 lg:w-[32rem]">
                <Search
                    size={14}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50"
                />
                <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    placeholder="Search modules..."
                    aria-label="Search modules"
                    onChange={(event) => handleSearchChange(event.target.value)}
                    onFocus={() => searchQuery.trim() && setIsSearchOpen(true)}
                    onKeyDown={handleSearchKeyDown}
                    className="navbar-search-input"
                />
                <kbd
                    aria-hidden="true"
                    className="pointer-events-none absolute right-4 top-1/2 hidden -translate-y-1/2
                    items-center gap-0.5 rounded-md
                    border border-border bg-muted px-2 py-0.5
                    text-[10px] font-medium text-muted-foreground/50
                    sm:inline-flex"
                >
                    {searchShortcutLabel}
                </kbd>

                {showSearchResults && (
                    <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-40 overflow-hidden rounded-lg border border-border bg-background shadow-lg">
                        <ul className="max-h-64 overflow-y-auto py-1">
                            {searchResults.map((route, index) => {
                                const isActive = index === activeSearchIndex;
                                return (
                                    <li key={route.key}>
                                        <button
                                            type="button"
                                            onMouseEnter={() => setActiveSearchIndex(index)}
                                            onClick={() =>
                                                route.path && handleSearchSelect(route.path)
                                            }
                                            className={`flex w-full items-center justify-between gap-3 px-3.5 py-2 text-left text-[13px] transition-colors ${
                                                isActive
                                                    ? "bg-accent text-foreground"
                                                    : "text-foreground/60 hover:bg-muted/60 hover:text-foreground"
                                            }`}
                                        >
                                            <span className="font-medium">{route.label}</span>
                                            <span className="text-[11px] text-foreground/35">
                                                {route.path}
                                            </span>
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
}
