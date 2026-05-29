import { useAuth, useAuthStore } from "@repo/auth";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { ChevronDown, LogOut } from "lucide-react";
import type { JSX } from "react";
import { useEffect, useRef, useState } from "react";

import type { RouteConfig } from "../../config/routeConfig";
import { canAccess, ROUTES } from "../../config/routeConfig";
import { useAdminAuthStore } from "../../store/admin-auth-store";

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
    const queryClient = useQueryClient();
    const sidebarRef = useRef<HTMLDivElement>(null);

    const { role } = useAuth();
    const clearAuth = useAuthStore((state) => state.clearAuth);
    const adminLogout = useAdminAuthStore((state) => state.logout);

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
        adminLogout();
        void queryClient.cancelQueries();
        queryClient.clear();
        void navigate({ to: "/login" as never });
    };

    const visibleRoutes = ROUTES.filter((item) => canAccess(item.roles, role ?? undefined));

    const isPathActive = (path: string | undefined): boolean =>
        path !== undefined &&
        (location.pathname === path || location.pathname.startsWith(path + "/"));

    const renderItem = (item: RouteConfig): JSX.Element | null => {
        const Icon = item.icon!;

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
                        className={`group flex w-full items-center justify-between rounded-xl
                            px-3 py-2.5 text-sm transition-all duration-200
                            ${
                                isChildActive
                                    ? "bg-indigo-50 text-indigo-700 shadow-sm ring-1 ring-indigo-100"
                                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                            }`}
                    >
                        <div className="flex items-center gap-3">
                            <div
                                className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg transition-all duration-200
                                    ${isChildActive ? "bg-indigo-600 shadow-sm shadow-indigo-200" : "bg-slate-100 group-hover:bg-slate-200"}`}
                            >
                                <Icon
                                    size={13}
                                    className={
                                        isChildActive
                                            ? "text-white"
                                            : "text-slate-500 group-hover:text-slate-700"
                                    }
                                />
                            </div>
                            <span className="text-[13px] font-medium">{item.label}</span>
                        </div>
                        <ChevronDown
                            size={12}
                            className={`flex-shrink-0 transition-transform duration-200 ${
                                isExpanded ? "rotate-180" : ""
                            } ${isChildActive ? "text-indigo-500" : "text-slate-400"}`}
                        />
                    </button>

                    <div
                        className={`overflow-hidden transition-all duration-200 ${
                            isExpanded ? "mt-0.5 max-h-60" : "max-h-0"
                        }`}
                    >
                        <div className="ml-[2.375rem] border-l-2 border-slate-100 pl-3 pb-0.5 pt-0.5">
                            {visibleChildren.map((child) => {
                                const active = isPathActive(child.path);
                                return (
                                    <Link
                                        key={child.key}
                                        to={child.path!}
                                        onClick={onCloseMobile}
                                        className={`block rounded-lg px-2.5 py-[5px] text-[12.5px]
                                            no-underline transition-all duration-150 hover:no-underline
                                            ${
                                                active
                                                    ? "font-semibold text-indigo-700"
                                                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
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

        const active = isPathActive(item.path);

        return (
            <Link
                key={item.key}
                to={item.path!}
                onClick={onCloseMobile}
                className={`group flex items-center gap-3 rounded-xl px-3 py-2.5
                    no-underline transition-all duration-200 hover:no-underline
                    ${
                        active
                            ? "bg-indigo-50 text-indigo-700 shadow-sm ring-1 ring-indigo-100"
                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    }`}
            >
                <div
                    className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg transition-all duration-200
                        ${active ? "bg-indigo-600 shadow-sm shadow-indigo-200" : "bg-slate-100 group-hover:bg-slate-200"}`}
                >
                    <Icon
                        size={13}
                        className={
                            active ? "text-white" : "text-slate-500 group-hover:text-slate-700"
                        }
                    />
                </div>
                <span className="text-[13px] font-medium">{item.label}</span>
            </Link>
        );
    };

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
            {mobileOpen && (
                <div
                    className="fixed inset-0 z-40 bg-slate-900/20 backdrop-blur-[2px] md:hidden"
                    onClick={onCloseMobile}
                />
            )}

            <aside
                ref={sidebarRef}
                className={`
                    fixed md:relative z-50 flex h-screen md:h-full flex-shrink-0 flex-col
                    overflow-hidden bg-white
                    border-r border-slate-100
                    transition-all duration-300 ease-in-out
                    w-[min(var(--sidebar-width),calc(100vw-1rem))] md:w-[var(--sidebar-width)]
                    ${mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
                `}
            >
                {/* Logo */}
                <div
                    className="flex h-[var(--nav-height)] flex-shrink-0 items-center justify-center
                        border-b border-border/70 px-4"
                >
                    <span className="select-none text-[16px] font-bold tracking-[-0.01em] text-foreground">
                        Smash<span className="text-cta">Book</span>
                    </span>
                </div>

                {/* Navigation */}
                <nav className="flex-1 overflow-y-auto px-3 py-4">
                    {groupedRoutes.map(({ group, items }, idx) => (
                        <div key={group} className={idx > 0 ? "mt-5" : ""}>
                            {group && (
                                <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                                    {group}
                                </p>
                            )}
                            <div className="space-y-0.5">{items.map(renderItem)}</div>
                        </div>
                    ))}
                </nav>

                {/* Logout */}
                <div className="flex-shrink-0 border-t border-slate-100 px-3 py-3">
                    <button
                        onClick={handleLogout}
                        className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5
                            text-slate-500 transition-all duration-200
                            hover:bg-red-50 hover:text-red-600"
                    >
                        <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100 transition-all duration-200 group-hover:bg-red-100">
                            <LogOut
                                size={13}
                                className="transition-colors duration-200 group-hover:text-red-500"
                            />
                        </div>
                        <span className="text-[13px] font-medium">Logout</span>
                    </button>
                </div>
            </aside>
        </>
    );
}
