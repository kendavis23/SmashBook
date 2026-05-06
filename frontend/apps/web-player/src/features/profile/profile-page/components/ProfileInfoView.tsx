import type { ChangeEvent, FormEvent, JSX } from "react";
import type { UserResponse } from "@repo/auth";
import { AlertToast } from "@repo/ui";
import { Upload } from "lucide-react";

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
    onFormChange: (patch: Partial<InfoFormState>) => void;
    onFileChange: (e: ChangeEvent<HTMLInputElement>) => void;
    onSubmit: (e: FormEvent) => void;
    onDismissError: () => void;
};

export function ProfileInfoView({
    user,
    form,
    preview,
    isPending,
    apiError,
    onFormChange,
    onFileChange,
    onSubmit,
    onDismissError,
}: Props): JSX.Element {
    const rawSkill = user.skill_level;
    const skillLevel =
        typeof rawSkill === "number"
            ? rawSkill
            : rawSkill != null && !Number.isNaN(Number(rawSkill))
                ? Number(rawSkill)
                : null;

    return (
        <form onSubmit={onSubmit} noValidate className="space-y-5">
            {apiError ? (
                <AlertToast title={apiError} variant="error" onClose={onDismissError} />
            ) : null}

            {/* Avatar row */}
            <div className="flex items-center gap-4">
                <div
                    className={`relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-full ring-2 ring-border ring-offset-2 ring-offset-background ${preview ? "" : avatarBgColor(user.full_name)} flex items-center justify-center`}
                >
                    {preview ? (
                        <img src={preview} alt="Avatar" className="h-full w-full object-cover" />
                    ) : (
                        <span className="text-xl font-bold text-white">
                            {getInitials(user.full_name)}
                        </span>
                    )}
                </div>
                <div className="flex flex-col gap-0.5">
                    <p className="text-sm font-semibold text-foreground">{user.full_name}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                    <label className="mt-1.5 cursor-pointer">
                        <input type="file" accept="image/*" onChange={onFileChange} className="hidden" />
                        <div className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted/30 px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition hover:bg-muted">
                            <Upload size={11} />
                            Change photo
                        </div>
                    </label>
                </div>
            </div>

            {/* Editable fields */}
            <div className="space-y-3">
                <div>
                    <label htmlFor="full_name" className="mb-1.5 block text-xs font-medium text-muted-foreground">
                        Full Name
                    </label>
                    <input
                        type="text"
                        id="full_name"
                        name="full_name"
                        value={form.full_name}
                        onChange={(e) => onFormChange({ full_name: e.target.value })}
                        placeholder="Your full name"
                        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground transition focus:border-cta focus:outline-none focus:ring-2 focus:ring-cta/20"
                    />
                </div>
                <div>
                    <label htmlFor="phone" className="mb-1.5 block text-xs font-medium text-muted-foreground">
                        Phone
                    </label>
                    <input
                        type="tel"
                        id="phone"
                        name="phone"
                        value={form.phone}
                        onChange={(e) => onFormChange({ phone: e.target.value })}
                        placeholder="+1 234 567 890"
                        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground transition focus:border-cta focus:outline-none focus:ring-2 focus:ring-cta/20"
                    />
                </div>
            </div>

            {/* Read-only fields */}
            <div className="space-y-3">
                <div>
                    <p className="mb-1.5 text-xs font-medium text-muted-foreground">Email</p>
                    <div className="flex items-center rounded-xl border border-border/60 bg-muted/20 px-3 py-2 text-sm text-foreground/70">
                        {user.email}
                    </div>
                </div>
                <div>
                    <p className="mb-1.5 text-xs font-medium text-muted-foreground">Role</p>
                    <div className="flex items-center rounded-xl border border-border/60 bg-muted/20 px-3 py-2 text-sm capitalize text-foreground/70">
                        {user.role}
                    </div>
                </div>
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2.5">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-[10px] font-medium uppercase tracking-wide text-amber-600 dark:text-amber-400">
                                Skill Level
                            </p>
                            <p className="mt-0.5 text-sm font-semibold text-foreground">
                                {skillLevel !== null
                                    ? `${skillLevel} / 7 — ${getSkillLabel(skillLevel)}`
                                    : "Not yet assigned"}
                            </p>
                        </div>

                    </div>
                </div>
            </div>

            <div className="flex pt-1 sm:justify-end">
                <button
                    type="submit"
                    disabled={isPending}
                    className="btn-cta min-h-9 w-full px-6 text-sm sm:w-auto"
                >
                    {isPending ? "Saving…" : "Save changes"}
                </button>
            </div>
        </form>
    );
}
