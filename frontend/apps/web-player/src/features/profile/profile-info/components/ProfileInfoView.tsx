import type { ChangeEvent, FormEvent, JSX } from "react";
import type { UserResponse } from "@repo/auth";
import { AlertToast } from "@repo/ui";
import { Mail, Phone, ShieldCheck, Star, Upload, User } from "lucide-react";

function getInitials(name: string): string {
    return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
}

function avatarBgColor(name: string): string {
    const colors = [
        "bg-violet-500",
        "bg-blue-500",
        "bg-emerald-500",
        "bg-amber-500",
        "bg-rose-500",
        "bg-cyan-500",
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length] ?? "bg-violet-500";
}

function getSkillLabel(level: number): string {
    if (level <= 1.5) return "Beginner";
    if (level <= 2.5) return "Novice";
    if (level <= 3.5) return "Intermediate";
    if (level <= 4.5) return "Advanced";
    if (level <= 5.5) return "Expert";
    if (level <= 6.5) return "Elite";
    return "Pro";
}

export type InfoFormState = {
    full_name: string;
    phone: string;
    photo_url: string;
};

type Props = {
    user: UserResponse;
    form: InfoFormState;
    preview: string | null;
    isPending: boolean;
    apiError: string;
    successMessage: string;
    onFormChange: (patch: Partial<InfoFormState>) => void;
    onFileChange: (e: ChangeEvent<HTMLInputElement>) => void;
    onSubmit: (e: FormEvent) => void;
    onDismissError: () => void;
    onDismissSuccess: () => void;
};

export function ProfileInfoView({
    user,
    form,
    preview,
    isPending,
    apiError,
    successMessage,
    onFormChange,
    onFileChange,
    onSubmit,
    onDismissError,
    onDismissSuccess,
}: Props): JSX.Element {
    const rawSkill = user.skill_level;
    const skillLevel =
        typeof rawSkill === "number"
            ? rawSkill
            : rawSkill != null && !Number.isNaN(Number(rawSkill))
              ? Number(rawSkill)
              : null;
    const skillPercent =
        skillLevel !== null ? Math.min(Math.max((skillLevel / 7) * 100, 0), 100) : 0;

    return (
        <form
            onSubmit={onSubmit}
            noValidate
            className="grid gap-5 lg:grid-cols-[17rem_minmax(0,1fr)] xl:grid-cols-[20rem_minmax(0,1fr)]"
        >
            {apiError ? (
                <div className="lg:col-span-2">
                    <AlertToast title={apiError} variant="error" onClose={onDismissError} />
                </div>
            ) : null}
            {successMessage ? (
                <div className="lg:col-span-2">
                    <AlertToast
                        title={successMessage}
                        variant="success"
                        onClose={onDismissSuccess}
                    />
                </div>
            ) : null}

            {/* Avatar row */}
            <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-muted/10 p-6 text-center shadow-xs lg:row-span-3 lg:min-h-[23rem]">
                <div
                    className={`relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-full ring-4 ring-background ring-offset-2 ring-offset-border ${preview ? "" : avatarBgColor(user.full_name)} flex items-center justify-center shadow-sm`}
                >
                    {preview ? (
                        <img src={preview} alt="Avatar" className="h-full w-full object-cover" />
                    ) : (
                        <span className="text-3xl font-bold text-white">
                            {getInitials(user.full_name)}
                        </span>
                    )}
                </div>
                <div className="mt-4 flex w-full min-w-0 flex-col items-center gap-1">
                    <p className="max-w-full truncate text-base font-semibold text-foreground">
                        {user.full_name}
                    </p>
                    <p className="max-w-full truncate text-sm text-muted-foreground">
                        {user.email}
                    </p>
                    <label className="mt-3 cursor-pointer">
                        <input
                            type="file"
                            accept="image/*"
                            onChange={onFileChange}
                            className="hidden"
                        />
                        <div className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-border bg-background px-4 text-sm font-medium text-muted-foreground shadow-xs transition hover:border-cta/40 hover:bg-cta/5 hover:text-cta">
                            <Upload size={15} />
                            Change photo
                        </div>
                    </label>
                </div>
            </div>

            {/* Editable fields */}
            <div className="grid gap-4 sm:grid-cols-2">
                <div>
                    <label
                        htmlFor="full_name"
                        className="mb-2 flex items-center gap-2 text-sm font-medium text-muted-foreground"
                    >
                        <User size={16} />
                        Full Name
                    </label>
                    <input
                        type="text"
                        id="full_name"
                        name="full_name"
                        value={form.full_name}
                        onChange={(e) => onFormChange({ full_name: e.target.value })}
                        placeholder="Your full name"
                        className="min-h-12 w-full rounded-xl border border-border bg-background px-4 text-base text-foreground shadow-xs transition focus:border-cta focus:outline-none focus:ring-2 focus:ring-cta/20"
                    />
                </div>
                <div>
                    <label
                        htmlFor="phone"
                        className="mb-2 flex items-center gap-2 text-sm font-medium text-muted-foreground"
                    >
                        <Phone size={16} />
                        Phone
                    </label>
                    <input
                        type="tel"
                        id="phone"
                        name="phone"
                        value={form.phone}
                        onChange={(e) => onFormChange({ phone: e.target.value })}
                        placeholder="+1 234 567 890"
                        className="min-h-12 w-full rounded-xl border border-border bg-background px-4 text-base text-foreground shadow-xs transition focus:border-cta focus:outline-none focus:ring-2 focus:ring-cta/20"
                    />
                </div>
            </div>

            {/* Read-only fields */}
            <div className="grid gap-4 sm:grid-cols-2 lg:col-start-2">
                <div>
                    <p className="mb-2 flex items-center gap-2 text-sm font-medium text-muted-foreground">
                        <Mail size={16} />
                        Email
                    </p>
                    <div className="flex min-h-12 items-center rounded-xl border border-border/60 bg-muted/20 px-4 text-base text-foreground/70">
                        {user.email}
                    </div>
                </div>
                <div>
                    <p className="mb-2 flex items-center gap-2 text-sm font-medium text-muted-foreground">
                        <ShieldCheck size={16} />
                        Role
                    </p>
                    <div className="flex min-h-12 items-center rounded-xl border border-border/60 bg-muted/20 px-4 text-base capitalize text-foreground/70">
                        {user.role}
                    </div>
                </div>
                <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-5 py-4 shadow-xs sm:col-span-2">
                    <div className="flex items-start gap-4">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-500 ring-4 ring-amber-500/10">
                            <Star size={20} fill="currentColor" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400">
                                Skill Level
                            </p>
                            <p className="mt-2 text-lg font-semibold text-foreground">
                                {skillLevel !== null
                                    ? `${skillLevel} / 7 — ${getSkillLabel(skillLevel)}`
                                    : "Not yet assigned"}
                            </p>
                            <div className="mt-4 flex items-center gap-4">
                                <div className="h-2 flex-1 overflow-hidden rounded-full bg-border/60">
                                    <div
                                        className="h-full rounded-full bg-amber-500"
                                        style={{ width: `${skillPercent}%` }}
                                    />
                                </div>
                                <span className="w-10 text-right text-sm font-medium text-muted-foreground">
                                    {Math.round(skillPercent)}%
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex border-t border-border/60 pt-5 sm:justify-end lg:col-start-2">
                <button
                    type="submit"
                    disabled={isPending}
                    className="btn-cta min-h-11 w-full px-8 text-sm sm:w-auto"
                >
                    {isPending ? "Saving…" : "Save changes"}
                </button>
            </div>
        </form>
    );
}
