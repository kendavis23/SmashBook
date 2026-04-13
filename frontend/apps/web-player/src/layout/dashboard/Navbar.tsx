import { useAuth, useAuthStore } from "@repo/auth";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { LogOut, Menu, Search, Settings } from "lucide-react";
import type { JSX, KeyboardEvent as ReactKeyboardEvent } from "react";
import { useEffect, useRef, useState } from "react";

import { getRouteByPath, getSearchableRoutes } from "../../config/routeConfig";

import ProfileEditModal from "./ProfileEditModal";

const AVATAR_COLORS = [
    "bg-blue-600",
    "bg-violet-600",
    "bg-indigo-600",
    "bg-pink-600",
    "bg-emerald-600",
    "bg-rose-600",
    "bg-amber-600",
    "bg-teal-600",
];

function getInitials(name: string): string {
    return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
}

export function avatarBgColor(name: string): string {
    return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length] ?? "bg-blue-500";
}

interface NavbarProps {
    mobileOpen?: boolean;
    onOpenMobile?: () => void;
}

export default function Navbar({
    mobileOpen = false,
    onOpenMobile = () => {},
}: NavbarProps): JSX.Element | null {
    const location = useLocation();
    const currentRoute = getRouteByPath(location.pathname);

    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [activeSearchIndex, setActiveSearchIndex] = useState(0);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const searchRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const navigate = useNavigate();

    const { role } = useAuth();
    const user = useAuthStore((state) => state.user);
    const clearAuth = useAuthStore((state) => state.clearAuth);
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
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setIsDropdownOpen(false);
            }
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

    const handleLogout = (): void => {
        clearAuth();
        void navigate({ to: "/login" });
    };

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
            if (event.key === "Escape") {
                setIsSearchOpen(false);
            }
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
            if (selectedRoute?.path) {
                handleSearchSelect(selectedRoute.path);
            }
            return;
        }

        if (event.key === "Escape") {
            setIsSearchOpen(false);
        }
    };

    if (!user) return null;

    const initials = getInitials(user.full_name || "U");
    const bgColor = avatarBgColor(user.full_name || "U");
    const roleLabel = user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : "";

    return (
        <>
            <div className="grid w-full grid-cols-[1fr_auto_1fr] items-center gap-5">
                {/* ── Left: mobile trigger + page context ── */}
                <div className="flex min-w-0 items-center gap-3">
                    <button
                        onClick={onOpenMobile}
                        aria-label="Open menu"
                        className={`h-7 w-7 flex-shrink-0 items-center justify-center rounded-md
                            border border-border bg-transparent text-foreground/60
                            transition-all duration-150 hover:bg-accent hover:text-foreground md:hidden
                            ${mobileOpen ? "pointer-events-none opacity-0" : "flex"}`}
                    >
                        <Menu size={15} />
                    </button>

                    {currentRoute && (
                        <div className="hidden min-w-0 border-l-2 border-cta/60 pl-2.5 md:block">
                            <p className="navbar-page-title truncate">
                                {currentRoute.title ?? currentRoute.label}
                            </p>
                            {currentRoute.subtitle && (
                                <p className="navbar-page-subtitle truncate">
                                    {currentRoute.subtitle}
                                </p>
                            )}
                        </div>
                    )}
                </div>

                {/* ── Center: search ── */}
                <div
                    ref={searchRef}
                    className="relative w-full max-w-xl min-w-[200px] md:min-w-[400px]"
                >
                    <Search
                        size={13}
                        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/40"
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
                        className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2
                            items-center gap-0.5 rounded-md
                            border border-border/50 bg-muted px-1.5 py-0.5
                            text-[10px] font-medium tracking-tight text-muted-foreground/50 lg:inline-flex"
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

                {/* ── Right: profile menu ── */}
                <div className="flex items-center justify-end">
                    <div className="relative" ref={dropdownRef}>
                        <button
                            type="button"
                            onClick={() => setIsDropdownOpen((open) => !open)}
                            aria-label="Open profile menu"
                            aria-expanded={isDropdownOpen}
                            className="rounded-full p-1 transition-colors duration-150 hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring/30"
                        >
                            <div
                                className={`flex h-8 w-8 flex-shrink-0 items-center justify-center overflow-hidden rounded-full ring-2 ring-border/60 ${user.photo_url ? "" : bgColor}`}
                            >
                                {user.photo_url ? (
                                    <img
                                        src={user.photo_url}
                                        alt={user.full_name}
                                        className="h-full w-full object-cover"
                                    />
                                ) : (
                                    <span className="text-[10px] font-bold text-white">
                                        {initials}
                                    </span>
                                )}
                            </div>
                        </button>

                        {isDropdownOpen && (
                            <div className="absolute right-0 z-50 mt-3 w-80 overflow-hidden rounded-2xl border border-border/70 bg-background shadow-2xl backdrop-blur-sm">
                                <div className="border-b border-border/70 bg-muted/30 px-4 py-4">
                                    <div className="flex items-center gap-5">
                                        <div
                                            className={`flex h-14 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-full ring-2 ring-border/60 shadow-sm ${user.photo_url ? "" : bgColor}`}
                                        >
                                            {user.photo_url ? (
                                                <img
                                                    src={user.photo_url}
                                                    alt={user.full_name}
                                                    className="h-full w-full object-cover"
                                                />
                                            ) : (
                                                <span className="text-base font-bold text-white">
                                                    {initials}
                                                </span>
                                            )}
                                        </div>

                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm font-semibold text-foreground">
                                                {user.full_name}
                                            </p>
                                            <p className="mt-0.5 truncate text-xs text-muted-foreground/70">
                                                {user.email}
                                            </p>
                                            <span className="mt-2 inline-flex rounded-full border border-border/70 bg-background px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/80">
                                                {roleLabel}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-1.5 p-2.5">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsProfileModalOpen(true);
                                            setIsDropdownOpen(false);
                                        }}
                                        className="group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-all duration-150 hover:bg-accent/70"
                                    >
                                        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground/70 transition-colors group-hover:bg-background group-hover:text-foreground">
                                            <Settings size={15} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-foreground">
                                                Edit Profile
                                            </p>
                                            <p className="text-xs text-muted-foreground/70">
                                                Update your account details
                                            </p>
                                        </div>
                                    </button>

                                    <div className="mx-1 border-t border-border/70" />

                                    <button
                                        type="button"
                                        onClick={handleLogout}
                                        className="group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-all duration-150 hover:bg-destructive/10"
                                    >
                                        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-muted text-destructive transition-colors group-hover:bg-background">
                                            <LogOut size={15} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-foreground">
                                                Sign Out
                                            </p>
                                            <p className="text-xs text-muted-foreground/70">
                                                See you soon
                                            </p>
                                        </div>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <ProfileEditModal
                isOpen={isProfileModalOpen}
                onClose={() => setIsProfileModalOpen(false)}
                user={user}
            />
        </>
    );
}
