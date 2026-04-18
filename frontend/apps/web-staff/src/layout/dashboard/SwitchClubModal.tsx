import { useAuth, useAuthStore } from "@repo/auth";
import { Building2, Check, Loader2, X } from "lucide-react";
import type { JSX } from "react";
import { createPortal } from "react-dom";

export interface ClubOption {
    id: string;
    name: string;
    role: string;
}

interface SwitchClubModalProps {
    isOpen: boolean;
    onClose: () => void;
    clubs: ClubOption[];
    isLoading?: boolean;
}

function clubInitial(name: string): string {
    return name.charAt(0).toUpperCase();
}

const AVATAR_BG = [
    "from-blue-500 to-blue-700",
    "from-violet-500 to-violet-700",
    "from-emerald-500 to-emerald-700",
    "from-rose-500 to-rose-700",
    "from-amber-500 to-amber-700",
    "from-teal-500 to-teal-700",
    "from-indigo-500 to-indigo-700",
    "from-pink-500 to-pink-700",
];

function avatarGradient(name: string): string {
    // AVATAR_BG is a fixed 8-element array; both indices are always in bounds
    return AVATAR_BG[name.charCodeAt(0) % AVATAR_BG.length] ?? AVATAR_BG[0]!;
}

export default function SwitchClubModal({
    isOpen,
    onClose,
    clubs,
    isLoading = false,
}: SwitchClubModalProps): JSX.Element | null {
    const { clubId } = useAuth();
    const setActiveClubId = useAuthStore((s) => s.setActiveClubId);

    if (!isOpen) return null;

    const handleSelect = (id: string, name: string, role: string): void => {
        setActiveClubId(id, name, role);
        onClose();
    };

    return createPortal(
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm">
            <div
                className="flex min-h-full items-center justify-center p-4"
                onClick={(e) => e.target === e.currentTarget && onClose()}
            >
                <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-border bg-background shadow-2xl">
                    {/* Gradient header */}
                    <div className="relative overflow-hidden bg-gradient-to-br from-cta/90 to-cta px-6 py-5">
                        <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/10" />
                        <div className="absolute -bottom-8 -left-4 h-20 w-20 rounded-full bg-white/5" />
                        <div className="relative flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                                    <Building2 size={16} className="text-white" />
                                </div>
                                <div>
                                    <h2 className="text-sm font-semibold text-white">
                                        Switch Club
                                    </h2>
                                    <p className="text-xs text-white/70">
                                        {isLoading
                                            ? "Loading…"
                                            : `${clubs.length} club${clubs.length !== 1 ? "s" : ""} available`}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="rounded-lg p-1.5 text-white/70 transition-colors hover:bg-white/20 hover:text-white"
                                aria-label="Close"
                            >
                                <X size={15} />
                            </button>
                        </div>
                    </div>

                    {/* Club list */}
                    <div className="p-3">
                        {isLoading ? (
                            <div className="flex items-center justify-center gap-2 py-10">
                                <Loader2 size={16} className="animate-spin text-muted-foreground" />
                                <span className="text-sm text-muted-foreground">
                                    Loading clubs…
                                </span>
                            </div>
                        ) : (
                            <div className="space-y-1.5">
                                {clubs.map((club) => {
                                    const active = club.id === clubId;
                                    return (
                                        <button
                                            key={club.id}
                                            type="button"
                                            onClick={() =>
                                                handleSelect(club.id, club.name, club.role)
                                            }
                                            aria-pressed={active}
                                            className={`group flex w-full items-center gap-3.5 rounded-xl border px-4 py-3 text-left transition-all duration-150 ${
                                                active
                                                    ? "border-cta/25 bg-cta/8 shadow-sm"
                                                    : "border-transparent hover:border-border hover:bg-muted/50"
                                            }`}
                                        >
                                            {/* Avatar */}
                                            <span
                                                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-sm font-bold text-white shadow-sm ${avatarGradient(club.name)}`}
                                            >
                                                {clubInitial(club.name)}
                                            </span>

                                            <div className="min-w-0 flex-1">
                                                <p
                                                    className={`truncate text-sm font-semibold ${active ? "text-cta" : "text-foreground"}`}
                                                >
                                                    {club.name}
                                                </p>
                                                {active ? (
                                                    <p className="mt-0.5 text-[11px] font-medium text-cta/70">
                                                        Currently active
                                                    </p>
                                                ) : (
                                                    <p className="mt-0.5 text-[11px] text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
                                                        Click to switch
                                                    </p>
                                                )}
                                            </div>

                                            {active ? (
                                                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cta">
                                                    <Check size={12} className="text-white" />
                                                </div>
                                            ) : (
                                                <div className="h-6 w-6 shrink-0 rounded-full border-2 border-border/50 opacity-0 transition-opacity group-hover:opacity-100" />
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}
