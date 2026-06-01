import { useAuth, useLogout } from "@repo/auth";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { ChevronDown, LogOut, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import type { JSX } from "react";
import { useEffect, useRef, useState } from "react";

import type { RouteConfig } from "../../config/routeConfig";
import { canAccess, ROUTES } from "../../config/routeConfig";

interface SidebarProps {
    mobileOpen?: boolean;
    onCloseMobile?: () => void;
    collapsed?: boolean;
    onToggleCollapse?: () => void;
}

export default function Sidebar({
    mobileOpen = false,
    onCloseMobile = () => {},
    collapsed = false,
    onToggleCollapse = () => {},
}: SidebarProps): JSX.Element {
    const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({});
    const [openSubgroups, setOpenSubgroups] = useState<Record<string, boolean>>({});
    const [isHovered, setIsHovered] = useState(false);

    const location = useLocation();
    const navigate = useNavigate();
    const sidebarRef = useRef<HTMLDivElement>(null);

    const { role } = useAuth();
    const logout = useLogout();

    /* Cloudflare-style hover-to-expand: when the rail is collapsed, hovering
       temporarily reveals the full sidebar as a floating overlay. The persistent
       `collapsed` state never changes — only the visual presentation does. */
    const expanded = !collapsed || isHovered;

    /* Clear any stuck hover-expansion when the persistent collapsed state flips. */
    useEffect(() => {
        setIsHovered(false);
    }, [collapsed]);

    /* Seed the section/subgroup owning the active route as open — additively,
       so navigating never *closes* a section the user opened. From here on the
       open state is purely explicit (records below), so opening one section
       leaves others alone and route changes can't auto-collapse anything.
       The user closes a menu only by clicking its toggle. */
    useEffect(() => {
        for (const item of ROUTES) {
            if (!item.children) continue;
            const activeChild = item.children.find((c) => isPathActive(c.path));
            if (!activeChild) continue;
            setOpenMenus((prev) => (prev[item.label] ? prev : { ...prev, [item.label]: true }));
            const sg = activeChild.subgroup;
            if (sg) {
                const subKey = `${item.label}::${sg}`;
                setOpenSubgroups((prev) => (prev[subKey] ? prev : { ...prev, [subKey]: true }));
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [location.pathname]);

    const handleLogout = (): void => {
        logout.mutate(undefined, {
            onSettled: () => {
                void navigate({ to: "/login" });
            },
        });
    };

    const visibleRoutes = ROUTES.filter((item) => canAccess(item.roles, role ?? undefined));

    /* ── Shared helpers ──────────────────────────────────────────────────── */

    /** Returns true when this path is the current location.
     *  Uses exact match only — a more-specific registered sibling route
     *  (e.g. /subscription/payment) must not activate a parent (/subscription). */
    const isPathActive = (path: string | undefined): boolean => {
        if (path === undefined) return false;
        if (location.pathname === path) return true;
        // Only activate prefix-match when no other top-level route owns the
        // current pathname exactly (prevents /subscription lighting up on /subscription/payment).
        if (location.pathname.startsWith(path + "/")) {
            const allPaths = ROUTES.flatMap((r) =>
                r.children ? [r.path, ...r.children.map((c) => c.path)] : [r.path]
            ).filter(Boolean) as string[];
            return !allPaths.some((p) => p !== path && location.pathname === p);
        }
        return false;
    };

    /* ── Render helpers ──────────────────────────────────────────────────── */

    /** Render a single child link inside an expanded section (with its own icon). */
    const renderChildLink = (child: RouteConfig): JSX.Element => {
        const ChildIcon = child.icon;
        const active = isPathActive(child.path);
        return (
            <Link
                key={child.key}
                to={child.path!}
                onClick={onCloseMobile}
                className={`group flex items-center gap-2 rounded-md px-2 py-[4px] text-[12.5px]
                    no-underline transition-all duration-150 hover:no-underline
                    ${
                        active
                            ? "font-semibold text-cta"
                            : "text-foreground/70 hover:bg-accent hover:text-foreground"
                    }`}
            >
                {ChildIcon && (
                    <ChildIcon
                        size={13}
                        className={`flex-shrink-0 transition-colors ${
                            active
                                ? "text-cta"
                                : "text-foreground/45 group-hover:text-foreground/80"
                        }`}
                    />
                )}
                <span>{child.label}</span>
            </Link>
        );
    };

    const renderItem = (item: RouteConfig): JSX.Element | null => {
        const Icon = item.icon!;

        /* ── Collapsible section (has children) ──────────────────────────── */
        if (item.children) {
            const isOpen = openMenus[item.label] ?? false;
            const visibleChildren = item.children.filter((child) =>
                canAccess(child.roles, role ?? undefined)
            );
            const isChildActive = visibleChildren.some((child) => isPathActive(child.path));
            /* Open state is explicit only (seeded for the active route by the
               effect above) so opening/closing one section never affects others. */
            const isExpanded = isOpen;
            if (visibleChildren.length === 0) return null;

            /* Collapsed (rail, not hover-expanded): show icon only, clicking navigates to first child */
            if (!expanded) {
                const firstChild = visibleChildren[0];
                return (
                    <Link
                        key={item.key}
                        to={firstChild?.path ?? "/"}
                        onClick={onCloseMobile}
                        title={item.label}
                        className={`group flex w-full items-center justify-center rounded-md
                            py-[7px] no-underline transition-all duration-150 hover:no-underline
                            ${
                                isChildActive
                                    ? "bg-[var(--sidebar-active-bg)] text-cta"
                                    : "text-foreground/80 hover:bg-accent hover:text-foreground"
                            }`}
                    >
                        <Icon
                            size={16}
                            className={`flex-shrink-0 transition-colors ${
                                isChildActive
                                    ? "text-cta"
                                    : "text-foreground/55 group-hover:text-foreground/85"
                            }`}
                        />
                    </Link>
                );
            }

            /* Split children into subgroups (preserving order of first appearance).
               Children with no subgroup go into the leading "" bucket (flat list). */
            const subgroups: { label: string; items: RouteConfig[] }[] = [];
            for (const child of visibleChildren) {
                const sg = child.subgroup ?? "";
                const existing = subgroups.find((s) => s.label === sg);
                if (existing) existing.items.push(child);
                else subgroups.push({ label: sg, items: [child] });
            }

            /* When the section uses named subgroups (e.g. Operations →
               Booking / Players / Club) we render them as labelled blocks
               separated by dividers, with the subgroup's leading icon echoed
               on the right of its heading — instead of the single left rail. */
            const hasSubgroups = subgroups.some((sg) => sg.label);

            return (
                <div key={item.key}>
                    <button
                        onClick={() => setOpenMenus((prev) => ({ ...prev, [item.label]: !isOpen }))}
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
                            <span className="text-[13px] font-medium">{item.label}</span>
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
                            isExpanded ? "mt-0.5 max-h-[40rem]" : "max-h-0"
                        }`}
                    >
                        {hasSubgroups ? (
                            /* Collapsible subgroup blocks (Booking / Players / Club).
                               Each subgroup heading is its own toggle with a chevron,
                               so the section nests collapse → expand (Cloudflare-style). */
                            <div className="ml-1 border-l border-border/60 pl-1.5 pb-0.5">
                                {subgroups.map((sg) => {
                                    const SubIcon = sg.items[0]?.icon;
                                    const subKey = `${item.label}::${sg.label}`;
                                    const subActive = sg.items.some((c) => isPathActive(c.path));
                                    /* Explicit-only (seeded for the active route by the
                                       effect above) — toggling one leaves others alone. */
                                    const subOpen = openSubgroups[subKey] ?? false;

                                    /* No label → flat list, no toggle (defensive). */
                                    if (!sg.label) {
                                        return (
                                            <div key="_flat">{sg.items.map(renderChildLink)}</div>
                                        );
                                    }

                                    return (
                                        <div key={sg.label} className="mt-0.5">
                                            <button
                                                onClick={() =>
                                                    setOpenSubgroups((prev) => ({
                                                        ...prev,
                                                        [subKey]: !subOpen,
                                                    }))
                                                }
                                                className={`group flex w-full items-center
                                                    justify-between rounded-md px-2 py-[5px]
                                                    transition-all duration-150
                                                    ${
                                                        subActive
                                                            ? "text-cta"
                                                            : "text-foreground/80 hover:bg-accent hover:text-foreground"
                                                    }`}
                                            >
                                                <span className="flex items-center gap-2">
                                                    {SubIcon && (
                                                        <SubIcon
                                                            size={14}
                                                            className={`flex-shrink-0 ${
                                                                subActive
                                                                    ? "text-cta"
                                                                    : "text-foreground/55 group-hover:text-foreground/85"
                                                            }`}
                                                        />
                                                    )}
                                                    <span className="text-[13px] font-medium">
                                                        {sg.label}
                                                    </span>
                                                </span>
                                                <ChevronDown
                                                    size={12}
                                                    className={`flex-shrink-0 transition-transform duration-200 ${
                                                        subOpen ? "rotate-180" : ""
                                                    } ${
                                                        subActive
                                                            ? "text-cta"
                                                            : "text-foreground/40"
                                                    }`}
                                                />
                                            </button>
                                            {/* Child-of-child: indented one more level with
                                                its own left rail (Cloudflare-style nesting). */}
                                            <div
                                                className={`overflow-hidden transition-all duration-200 ${
                                                    subOpen ? "mt-px max-h-[40rem]" : "max-h-0"
                                                }`}
                                            >
                                                <div className="ml-[0.6875rem] border-l border-border/60 pl-2">
                                                    {sg.items.map(renderChildLink)}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            /* Flat list with a single left rail (e.g. Settings) */
                            <div className="ml-[1.0625rem] border-l border-border/60 pl-2.5 pb-0.5">
                                {subgroups.map((sg) => (
                                    <div
                                        key={sg.label || "_flat"}
                                        className={sg.label ? "mt-1" : ""}
                                    >
                                        {sg.label && (
                                            <p
                                                className="mb-0.5 px-2 pt-0.5 text-[10px] font-semibold
                                                    uppercase tracking-[0.1em] text-foreground/40"
                                            >
                                                {sg.label}
                                            </p>
                                        )}
                                        {sg.items.map(renderChildLink)}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            );
        }

        /* ── Leaf item ───────────────────────────────────────────────────── */
        const active = isPathActive(item.path);

        if (!expanded) {
            return (
                <Link
                    key={item.key}
                    to={item.path!}
                    onClick={onCloseMobile}
                    title={item.label}
                    className={`group flex w-full items-center justify-center rounded-md
                        py-[7px] no-underline transition-all duration-150 hover:no-underline
                        ${
                            active
                                ? "bg-[var(--sidebar-active-bg)] text-cta"
                                : "text-foreground/80 hover:bg-accent hover:text-foreground"
                        }`}
                >
                    <Icon
                        size={16}
                        className={`flex-shrink-0 transition-colors ${
                            active
                                ? "text-cta"
                                : "text-foreground/55 group-hover:text-foreground/85"
                        }`}
                    />
                </Link>
            );
        }

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

            {/* When collapsed, this rail spacer reserves the narrow width in the
                document flow so hover-expansion floats over content without
                shifting the page (Cloudflare-style). */}
            {collapsed && (
                <div className="hidden md:block w-[3.25rem] flex-shrink-0" aria-hidden="true" />
            )}

            <aside
                ref={sidebarRef}
                onMouseEnter={() => collapsed && setIsHovered(true)}
                onMouseLeave={() => {
                    /* Hover behaviour applies ONLY to the collapsed rail.
                       In full (pinned-open) mode, moving the cursor off the
                       sidebar must never close or collapse anything — only the
                       user closes menus, by clicking. */
                    if (!collapsed) return;
                    /* Only retract the hover overlay — keep the user's open
                       sections so the next hover reveals them exactly as left. */
                    setIsHovered(false);
                }}
                className={`
                    z-50 flex h-screen md:h-full flex-shrink-0 flex-col
                    overflow-hidden bg-background
                    border-r border-border
                    transition-all duration-300 ease-in-out
                    ${collapsed ? "fixed md:absolute left-0 top-0 bottom-0" : "fixed md:relative"}
                    ${expanded ? "shadow-xl md:shadow-none" : ""}
                    ${collapsed && expanded ? "md:shadow-xl" : ""}
                    ${
                        expanded
                            ? "w-[min(var(--sidebar-width),calc(100vw-1rem))] md:w-[var(--sidebar-width)]"
                            : "w-[3.25rem] md:w-[3.25rem]"
                    }
                    ${mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
                `}
            >
                {/* ── Brand header ─────────────────────────────────────────── */}
                <div
                    className="flex h-[var(--nav-height)] flex-shrink-0 items-center
                        border-b border-border/70 px-2"
                >
                    {!expanded ? (
                        <button
                            onClick={onToggleCollapse}
                            title="Expand sidebar"
                            className="flex w-full items-center justify-center rounded-md p-1.5
                                text-foreground/50 transition-colors hover:bg-accent hover:text-foreground"
                        >
                            <PanelLeftOpen size={16} />
                        </button>
                    ) : (
                        <div className="flex w-full items-center justify-between pl-2">
                            <span className="select-none text-[16px] font-bold tracking-[-0.01em] text-foreground">
                                Smash<span className="text-cta">Book</span>
                            </span>
                            <button
                                onClick={() => {
                                    setIsHovered(false);
                                    onToggleCollapse();
                                }}
                                title={collapsed ? "Pin sidebar open" : "Collapse sidebar"}
                                className="rounded-md p-1.5 text-foreground/40
                                    transition-colors hover:bg-accent hover:text-foreground"
                            >
                                {collapsed ? (
                                    <PanelLeftOpen size={15} />
                                ) : (
                                    <PanelLeftClose size={15} />
                                )}
                            </button>
                        </div>
                    )}
                </div>

                {/* ── Navigation ─────────────────────────────────────────── */}
                <nav className="flex-1 overflow-y-auto px-1.5 py-2">
                    {groupedRoutes.map(({ group, items }, idx) => {
                        /* A section made up entirely of collapsible parents already
                           renders its own label inside the trigger — don't repeat it
                           as a standalone heading. Only flat-leaf groups (e.g. Overview)
                           get a standalone section heading. */
                        const hasOnlyCollapsible = items.every((i) => i.children);
                        const showHeading = group && expanded && !hasOnlyCollapsible;
                        return (
                            <div key={group} className={idx > 0 ? "mt-2" : ""}>
                                {showHeading && (
                                    <p className="mb-0.5 px-2 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-foreground/45">
                                        {group}
                                    </p>
                                )}
                                {/* Divider between groups when collapsed (rail) */}
                                {group && !expanded && idx > 0 && (
                                    <div className="my-1.5 border-t border-border/50" />
                                )}
                                <div className="space-y-px">{items.map(renderItem)}</div>
                            </div>
                        );
                    })}
                </nav>

                {/* ── Bottom: logout ──────────────────────────────────────── */}
                <div className="flex-shrink-0 border-t border-border/70 px-1.5 py-2">
                    <button
                        onClick={handleLogout}
                        title="Logout"
                        className={`group flex w-full items-center rounded-md
                            text-[13px] text-foreground/60
                            transition-all duration-150
                            hover:bg-[var(--sidebar-hover-bg)] hover:text-foreground
                            ${expanded ? "gap-2.5 px-2.5 py-1.5" : "justify-center py-[7px]"}`}
                    >
                        <LogOut
                            size={expanded ? 14 : 16}
                            className="flex-shrink-0 transition-all duration-150
                                group-hover:text-foreground"
                        />
                        {expanded && <span>Logout</span>}
                    </button>
                </div>
            </aside>
        </>
    );
}
