import { useAuth, useAuthStore } from "@repo/auth";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { ChevronDown, LogOut } from "lucide-react";
import type { JSX } from "react";
import { useEffect, useRef, useState } from "react";

import type { RouteConfig } from "../../config/routeConfig";
import { canAccess, ROUTES } from "../../config/routeConfig";

interface SidebarProps {
    mobileOpen?: boolean;
    onCloseMobile?: () => void;
}

export default function Sidebar({
    mobileOpen = false,
    onCloseMobile = () => {},
}: SidebarProps): JSX.Element {
    const [openMenu, setOpenMenu] = useState<string | null>(null);

    const location = useLocation();
    const navigate = useNavigate();
    const sidebarRef = useRef<HTMLDivElement>(null);

    const { role } = useAuth();
    const clearAuth = useAuthStore((state) => state.clearAuth);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent): void => {
            if (sidebarRef.current && !sidebarRef.current.contains(e.target as Node)) {
                setOpenMenu(null);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleLogout = (): void => {
        clearAuth();
        void navigate({ to: "/login" });
    };

    const visibleRoutes = ROUTES.filter((item) => canAccess(item.roles, role ?? undefined));

    /* ── Shared helpers ──────────────────────────────────────────────────── */

    /** Returns true when this path (or any sub-path) is the current location */
    const isPathActive = (path: string | undefined): boolean =>
        path !== undefined &&
        (location.pathname === path || location.pathname.startsWith(path + "/"));

    /* ── Render helpers ──────────────────────────────────────────────────── */

    const renderItem = (item: RouteConfig): JSX.Element | null => {
        const Icon = item.icon!;

        /* ── Group item (has children) ───────────────────────────────────── */
        if (item.children) {
            const isOpen = openMenu === item.label;
            const visibleChildren = item.children.filter((child) =>
                canAccess(child.roles, role ?? undefined)
            );
            const isChildActive = visibleChildren.some((child) => isPathActive(child.path));
            const isExpanded = isOpen || isChildActive;
            if (visibleChildren.length === 0) return null;

            return (
                <div key={item.key}>
                    <button
                        onClick={() => setOpenMenu(isOpen ? null : item.label)}
                        className={`group flex w-full items-center justify-between rounded-md
                            px-2.5 py-[5px] text-sm transition-all duration-150
                            ${
                                isChildActive
                                    ? "bg-[var(--sidebar-active-bg)] font-semibold text-cta"
                                    : "text-foreground/80 hover:bg-accent hover:text-foreground"
                            }`}
                    >
                        <div className="flex items-center gap-2">
                            <Icon
                                size={14}
                                className={`flex-shrink-0 transition-colors ${
                                    isChildActive
                                        ? "text-cta"
                                        : "text-foreground/55 group-hover:text-foreground/85"
                                }`}
                            />
                            <span className="text-[13px]">{item.label}</span>
                        </div>
                        <ChevronDown
                            size={12}
                            className={`flex-shrink-0 transition-transform duration-200 ${
                                isExpanded ? "rotate-180" : ""
                            } ${isChildActive ? "text-cta" : "text-foreground/45"}`}
                        />
                    </button>

                    {/* Children */}
                    <div
                        className={`overflow-hidden transition-all duration-200 ${
                            isExpanded ? "mt-0.5 max-h-60" : "max-h-0"
                        }`}
                    >
                        <div className="ml-[2.125rem] border-l border-border/60 pl-2.5 pb-0.5">
                            {visibleChildren.map((child) => {
                                const active = isPathActive(child.path);
                                return (
                                    <Link
                                        key={child.key}
                                        to={child.path!}
                                        onClick={onCloseMobile}
                                        className={`block rounded-md px-2 py-[4px] text-[12.5px]
                                            no-underline transition-all duration-150 hover:no-underline
                                            ${
                                                active
                                                    ? "font-semibold text-cta"
                                                    : "text-foreground/70 hover:bg-accent hover:text-foreground"
                                            }`}
                                    >
                                        {child.label}
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                </div>
            );
        }

        /* ── Leaf item ───────────────────────────────────────────────────── */
        const active = isPathActive(item.path);

        return (
            <Link
                key={item.key}
                to={item.path!}
                onClick={onCloseMobile}
                className={`group flex items-center gap-2 rounded-md px-2.5 py-[5px]
                    no-underline transition-all duration-150 hover:no-underline
                    ${
                        active
                            ? "bg-[var(--sidebar-active-bg)] font-semibold text-cta"
                            : "text-foreground/80 hover:bg-accent hover:text-foreground"
                    }`}
            >
                <Icon
                    size={14}
                    className={`flex-shrink-0 transition-colors ${
                        active ? "text-cta" : "text-foreground/55 group-hover:text-foreground/85"
                    }`}
                />
                <span className="text-[13px]">{item.label}</span>
            </Link>
        );
    };

    /* ── Group routes by their group field ───────────────────────────────── */
    const groupedRoutes: { group: string; items: RouteConfig[] }[] = [];
    for (const item of visibleRoutes) {
        const group = item.group ?? "";
        const existing = groupedRoutes.find((g) => g.group === group);
        if (existing) {
            existing.items.push(item);
        } else {
            groupedRoutes.push({ group, items: [item] });
        }
    }

    return (
        <>
            {/* Mobile overlay */}
            {mobileOpen && (
                <div
                    className="fixed inset-0 z-40 bg-foreground/30 backdrop-blur-[2px] md:hidden"
                    onClick={onCloseMobile}
                />
            )}

            <aside
                ref={sidebarRef}
                className={`
                    fixed md:relative z-50 flex h-screen md:h-full flex-shrink-0 flex-col
                    overflow-hidden bg-background
                    border-r border-border
                    transition-all duration-300 ease-in-out
                    w-[min(var(--sidebar-width),calc(100vw-1rem))] md:w-[var(--sidebar-width)]
                    ${mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
                `}
            >
                {/* ── Brand header ─────────────────────────────────────────── */}
                <div
                    className="flex h-[var(--nav-height)] flex-shrink-0 items-center justify-center
                        border-b border-border/70 px-4"
                >
                    <span className="select-none text-[16px] font-bold tracking-[-0.01em] text-foreground">
                        Smash<span className="text-cta">Book</span>
                    </span>
                </div>

                {/* ── Navigation ─────────────────────────────────────────── */}
                <nav className="flex-1 overflow-y-auto px-2 py-2">
                    {groupedRoutes.map(({ group, items }, idx) => (
                        <div key={group} className={idx > 0 ? "mt-3" : ""}>
                            {/* Section label */}
                            {group && (
                                <p className="mb-0.5 px-2 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-foreground/45">
                                    {group}
                                </p>
                            )}
                            <div className="space-y-px">{items.map(renderItem)}</div>
                        </div>
                    ))}
                </nav>

                {/* ── Bottom: logout ──────────────────────────────────────── */}
                <div className="flex-shrink-0 border-t border-border/70 px-2 py-2">
                    <button
                        onClick={handleLogout}
                        className="group flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5
                            text-[13px] text-foreground/60
                            transition-all duration-150
                            hover:bg-[var(--sidebar-hover-bg)] hover:text-foreground"
                    >
                        <LogOut
                            size={14}
                            className="flex-shrink-0 transition-all duration-150
                                group-hover:text-foreground"
                        />
                        <span>Logout</span>
                    </button>
                </div>
            </aside>
        </>
    );
}
