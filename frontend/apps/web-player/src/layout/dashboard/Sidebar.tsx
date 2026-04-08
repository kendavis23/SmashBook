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

    const renderItem = (item: RouteConfig): JSX.Element | null => {
        const Icon = item.icon!;

        if (item.children) {
            const isOpen = openMenu === item.label;
            const visibleChildren = item.children.filter((child) =>
                canAccess(child.roles, role ?? undefined)
            );
            const isChildActive = visibleChildren.some(
                (child) =>
                    child.path !== undefined &&
                    (location.pathname === child.path ||
                        location.pathname.startsWith(child.path + "/"))
            );
            const isExpanded = isOpen || isChildActive;
            if (visibleChildren.length === 0) return null;

            return (
                <div key={item.key} className="relative mx-2 my-1">
                    <button
                        onClick={() => setOpenMenu(isOpen ? null : item.label)}
                        className="group flex w-full items-center justify-between pl-6 pr-4 py-2.5 text-sm
              text-foreground transition-colors duration-150 hover:bg-primary/15 hover:text-foreground rounded-md"
                    >
                        <div className="flex items-center gap-3">
                            <Icon
                                size={16}
                                className="flex-shrink-0 text-foreground transition-colors group-hover:text-foreground"
                            />
                            <span>{item.label}</span>
                        </div>
                        <ChevronDown
                            size={14}
                            className={`text-foreground transition-transform duration-200 ${
                                isExpanded ? "rotate-180" : ""
                            }`}
                        />
                    </button>

                    <div
                        className={`overflow-hidden  transition-all duration-200 ${
                            isExpanded ? "max-h-60 mt-0.5" : "max-h-0"
                        }`}
                    >
                        <div className="mt-0.5 mb-1">
                            {visibleChildren.map((child) => (
                                <Link
                                    key={child.key}
                                    to={child.path!}
                                    onClick={onCloseMobile}
                                    className="block pr-4 py-2.5 text-[13px] transition-colors duration-150 no-underline hover:no-underline"
                                    activeProps={{
                                        className:
                                            "border-primary bg-primary/10 pl-[22px] pr-4 py-2.5 font-medium text-primary rounded-md mx-2 my-1",
                                    }}
                                    inactiveProps={{
                                        className:
                                            "pl-12 text-foreground hover:bg-primary/15 hover:text-foreground rounded-md mx-2 my-1",
                                    }}
                                >
                                    {child.label}
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>
            );
        }

        const isItemActive =
            item.path !== undefined &&
            (location.pathname === item.path || location.pathname.startsWith(item.path + "/"));

        return (
            <Link
                key={item.key}
                to={item.path!}
                onClick={onCloseMobile}
                className={`group relative flex items-center gap-3 text-sm transition-colors duration-150 no-underline hover:no-underline ${
                    isItemActive
                        ? "border-primary bg-primary/10 pl-[22px] pr-4 py-2.5 font-medium text-primary rounded-md mx-2 my-1"
                        : "pl-6 pr-4 py-2.5 text-foreground hover:bg-primary/15 hover:text-foreground rounded-md mx-2 my-1"
                }`}
            >
                <Icon
                    size={16}
                    className={`flex-shrink-0 transition-colors ${
                        isItemActive
                            ? "text-primary"
                            : "text-foreground group-hover:text-foreground"
                    }`}
                />
                <span>{item.label}</span>
            </Link>
        );
    };

    return (
        <>
            {mobileOpen && (
                <div
                    className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-[1px] md:hidden"
                    onClick={onCloseMobile}
                />
            )}

            <aside
                ref={sidebarRef}
                className={`
          fixed md:relative z-50 h-screen md:h-full overflow-hidden text-foreground
          border-r border-border bg-background
          shadow-sm
          flex flex-col transition-all duration-300 ease-in-out flex-shrink-0
          w-[min(20rem,calc(100vw-1rem))] md:w-60
          ${mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        `}
            >
                <nav className="flex-1 overflow-y-auto py-2">
                    <div>{visibleRoutes.map(renderItem)}</div>
                </nav>

                <div className="border-t border-border py-2 flex-shrink-0">
                    <button
                        onClick={handleLogout}
                        className="group flex w-full items-center gap-3 pl-6 pr-4 py-2.5 text-sm
            text-muted-foreground 
            transition-all duration-200
            hover:bg-primary/15 hover:text-foreground
            active:scale-[0.98]"
                    >
                        <LogOut
                            size={16}
                            className="flex-shrink-0 transition-all duration-200
              text-muted-foreground 
              group-hover:text-foreground group-hover:-translate-x-0.5"
                        />
                        <span className="transition-colors duration-200">Logout</span>
                    </button>
                </div>
            </aside>
        </>
    );
}
