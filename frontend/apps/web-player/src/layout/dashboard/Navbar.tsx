import { useAuthStore } from "@repo/auth";
import { useNavigate } from "@tanstack/react-router";
import { LogOut, Menu, Search, Settings } from "lucide-react";
import type { JSX, KeyboardEvent as ReactKeyboardEvent } from "react";
import { useEffect, useRef, useState } from "react";

import { getSearchableRoutes } from "../../config/routeConfig";

import ProfileEditModal from "./ProfileEditModal";

const AVATAR_COLORS = [
    "bg-blue-500",
    "bg-violet-500",
    "bg-indigo-500",
    "bg-pink-500",
    "bg-emerald-500",
    "bg-rose-500",
    "bg-amber-500",
    "bg-teal-500",
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
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [activeSearchIndex, setActiveSearchIndex] = useState(0);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const searchRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const navigate = useNavigate();

    const user = useAuthStore((state) => state.user);
    const clearAuth = useAuthStore((state) => state.clearAuth);
    const searchResults = getSearchableRoutes(user?.role).filter((route) =>
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
            <div className="relative flex w-full items-center gap-3">
                {/* Left — brand + mobile menu trigger */}
                <div className="flex flex-shrink-0 items-center gap-3">
                    <button
                        onClick={onOpenMobile}
                        aria-label="Open menu"
                        className={`h-10 w-10 items-center justify-center rounded-xl border border-border
              bg-background text-foreground shadow-sm transition-all duration-200
              hover:bg-muted md:hidden ${mobileOpen ? "pointer-events-none opacity-0" : "flex"}`}
                    >
                        <Menu size={20} />
                    </button>
                    <span className="select-none text-[26px] font-bold tracking-tight text-foreground">
                        Smash<span className="text-primary">Book</span>
                    </span>
                </div>

                {/* Center – module search */}
                <div className="hidden flex-1 justify-center px-2 md:flex">
                    <div ref={searchRef} className="relative w-full max-w-xl">
                        <Search
                            size={15}
                            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
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
                            className="w-full rounded-lg border border-primary/20 py-2 pl-9 pr-20 text-sm
      text-foreground outline-none transition-all duration-200
      placeholder:text-muted-foreground
      focus:border-primary focus:bg-background focus:ring-2 focus:ring-primary/5 bg-background"
                        />
                        <span
                            aria-hidden="true"
                            className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-md
        border border-border bg-background px-2 py-1 text-[11px] font-medium text-muted-foreground lg:inline-flex"
                        >
                            {searchShortcutLabel}
                        </span>

                        {showSearchResults && (
                            <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-40 overflow-hidden rounded-xl border border-border bg-background shadow-md">
                                <ul className="max-h-72 overflow-y-auto py-1.5">
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
                                                    className={`flex w-full items-center justify-between gap-3 px-4 py-2 text-left text-sm transition-colors ${
                                                        isActive
                                                            ? "bg-accent text-foreground"
                                                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                                    }`}
                                                >
                                                    <span className="font-medium">
                                                        {route.label}
                                                    </span>
                                                    <span className="text-xs text-muted-foreground">
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

                {/* Right */}
                <div className="ml-auto flex flex-shrink-0 items-center gap-3">
                    <div className="relative" ref={dropdownRef}>
                        <button
                            type="button"
                            onClick={() => setIsDropdownOpen((o) => !o)}
                            aria-label="Open profile menu"
                            aria-expanded={isDropdownOpen}
                            className="rounded-full p-1 transition-colors duration-150 hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary/20"
                        >
                            <div
                                className={`flex h-8 w-8 items-center justify-center overflow-hidden rounded-full shadow-sm ${
                                    user.photo_url ? "" : bgColor
                                }`}
                            >
                                {user.photo_url ? (
                                    <img
                                        src={user.photo_url}
                                        alt={user.full_name}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <span className="text-xs font-bold text-primary-foreground">
                                        {initials}
                                    </span>
                                )}
                            </div>
                        </button>

                        {isDropdownOpen && (
                            <div className="absolute right-0 z-50 mt-3 w-72 overflow-hidden rounded-2xl border border-border bg-background shadow-lg">
                                <div className="border-b border-border px-4 py-4">
                                    <div className="flex items-center gap-3">
                                        <div
                                            className={`flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-full ring-1 ring-border shadow-sm ${user.photo_url ? "" : bgColor}`}
                                        >
                                            {user.photo_url ? (
                                                <img
                                                    src={user.photo_url}
                                                    alt={user.full_name}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <span className="text-base font-bold text-primary-foreground">
                                                    {initials}
                                                </span>
                                            )}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm font-semibold text-foreground">
                                                {user.full_name}
                                            </p>
                                            <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                                                {user.email}
                                            </p>
                                            <span className="mt-1.5 inline-flex rounded-md bg-muted px-2 py-0.5 text-[10px] font-medium capitalize tracking-wide text-muted-foreground">
                                                {roleLabel}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-2">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsProfileModalOpen(true);
                                            setIsDropdownOpen(false);
                                        }}
                                        className="group/item flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors duration-150 hover:bg-primary/10"
                                    >
                                        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-muted transition-colors group-hover/item:bg-accent">
                                            <Settings className="h-3.5 w-3.5 text-muted-foreground transition-colors group-hover/item:text-primary" />
                                        </div>
                                        <div className="text-left">
                                            <p className="text-sm font-medium text-foreground">
                                                Edit Profile
                                            </p>
                                            <p className="text-[11px] text-muted-foreground">
                                                Update your account details
                                            </p>
                                        </div>
                                    </button>

                                    <div className="mx-1 my-1 border-t border-border" />

                                    <button
                                        type="button"
                                        onClick={handleLogout}
                                        className="group/item flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors duration-150 hover:bg-primary/10"
                                    >
                                        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-muted transition-colors group-hover/item:bg-accent">
                                            <LogOut className="h-3.5 w-3.5 text-muted-foreground group-hover/item:text-foreground" />
                                        </div>
                                        <div className="text-left">
                                            <p className="text-sm font-medium text-foreground">
                                                Sign Out
                                            </p>
                                            <p className="text-[11px] text-muted-foreground">
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
