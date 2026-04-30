import { Breadcrumb, AlertToast } from "@repo/ui";
import { Users, RefreshCw, UserPlus, X } from "lucide-react";
import { useState } from "react";
import { createPortal } from "react-dom";
import type { FormEvent, JSX } from "react";
import type { PlayerSearchResult } from "../../hooks";
import { useUpdateSkillLevel } from "@repo/staff-domain/hooks";
import SkillHistoryPanel from "./SkillHistoryPanel";
import PlayerProfileAutocomplete from "./PlayerProfileAutocomplete";

type Props = {
    clubId: string | null;
    canRegister: boolean;
    onRegisterClick: () => void;
    registerSuccessMsg: string;
    onDismissSuccess: () => void;
};

function UpdateSkillDialog({
    playerId,
    playerName,
    onUpdated,
    onClose,
}: {
    playerId: string;
    playerName: string;
    onUpdated: (skillLevel: number) => void;
    onClose: () => void;
}): JSX.Element {
    const [newLevel, setNewLevel] = useState("");
    const [reason, setReason] = useState("");
    const [levelError, setLevelError] = useState("");
    const updateSkill = useUpdateSkillLevel(playerId);

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        const level = Number(newLevel);
        const isValidRange = !isNaN(level) && level >= 1 && level <= 7;
        if (!newLevel || !isValidRange) {
            setLevelError("Enter a value between 1 and 7 (e.g. 3.5, 4.2, 6).");
            return;
        }
        setLevelError("");
        updateSkill.mutate(
            { new_level: level, reason: reason.trim() || null },
            {
                onSuccess: (result) => {
                    onUpdated(result.skill_level);
                    onClose();
                },
            }
        );
    };

    return createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-sm rounded-xl border border-border bg-background shadow-xl">
                <div className="flex items-center justify-between border-b border-border px-5 py-4">
                    <div>
                        <h2 className="text-sm font-semibold text-foreground">
                            Update Skill Level
                        </h2>
                        <p className="mt-0.5 text-xs text-muted-foreground">{playerName}</p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                    >
                        <X size={14} />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4 px-5 py-4">
                    <div>
                        <label className="mb-1 block text-xs font-medium text-muted-foreground">
                            New Level <span className="text-destructive">*</span>
                        </label>
                        <input
                            type="number"
                            min={1}
                            max={7}
                            step="any"
                            value={newLevel}
                            onChange={(e) => setNewLevel(e.target.value)}
                            placeholder="1 – 7 (e.g. 4.2)"
                            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-cta focus:outline-none focus:ring-2 focus:ring-cta-ring/30"
                        />
                        {levelError ? (
                            <p className="mt-1 text-xs text-destructive">{levelError}</p>
                        ) : null}
                    </div>
                    <div>
                        <label className="mb-1 block text-xs font-medium text-muted-foreground">
                            Reason <span className="text-muted-foreground/50">(optional)</span>
                        </label>
                        <textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="e.g. Improved backhand, tournament result…"
                            rows={3}
                            className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-cta focus:outline-none focus:ring-2 focus:ring-cta-ring/30"
                        />
                    </div>
                    {updateSkill.error ? (
                        <p className="text-xs text-destructive">
                            {(updateSkill.error as Error).message}
                        </p>
                    ) : null}
                    <div className="flex justify-end gap-2 pt-1">
                        <button
                            type="button"
                            onClick={onClose}
                            className="btn-outline px-4 py-2 text-sm"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={updateSkill.isPending}
                            className="btn-cta px-4 py-2 text-sm disabled:opacity-60"
                        >
                            {updateSkill.isPending ? "Saving…" : "Save"}
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
}

export default function PlayersView({
    clubId,
    canRegister,
    onRegisterClick,
    registerSuccessMsg,
    onDismissSuccess,
}: Props): JSX.Element {
    const [selectedPlayer, setSelectedPlayer] = useState<PlayerSearchResult | null>(null);
    const [updatePlayer, setUpdatePlayer] = useState<PlayerSearchResult | null>(null);
    const [profileRefreshSignal, setProfileRefreshSignal] = useState(0);

    return (
        <div className="w-full space-y-5">
            <Breadcrumb items={[{ label: "Players" }]} />

            {registerSuccessMsg ? (
                <AlertToast
                    title={registerSuccessMsg}
                    variant="success"
                    onClose={onDismissSuccess}
                />
            ) : null}

            <section className="card-surface overflow-hidden">
                <header className="flex flex-col gap-3 border-b border-border bg-muted/10 px-5 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2.5">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary text-secondary-foreground shadow-xs">
                                <Users size={16} />
                            </div>
                            <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                    <h1 className="text-lg font-semibold tracking-tight text-foreground">
                                        Players
                                    </h1>
                                    {selectedPlayer ? (
                                        <span className="rounded-full border border-border bg-background px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground shadow-xs">
                                            {selectedPlayer.full_name}
                                        </span>
                                    ) : null}
                                </div>
                                <p className="mt-0.5 text-sm text-muted-foreground">
                                    Manage your club&apos;s players
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                        <div className="w-full sm:w-72">
                            <PlayerProfileAutocomplete
                                clubId={clubId}
                                selectedPlayer={selectedPlayer}
                                onSelect={setSelectedPlayer}
                                onClear={() => setSelectedPlayer(null)}
                            />
                        </div>
                        <button
                            onClick={() => setProfileRefreshSignal((value) => value + 1)}
                            className="btn-outline min-h-10 px-4"
                            aria-label="Refresh player profile"
                        >
                            <RefreshCw size={14} /> Refresh
                        </button>
                        {canRegister ? (
                            <button onClick={onRegisterClick} className="btn-cta min-h-10 px-4">
                                <UserPlus size={14} /> Register Player
                            </button>
                        ) : null}
                    </div>
                </header>

                <div className="min-w-0 bg-muted/15">
                    <SkillHistoryPanel
                        selectedPlayer={selectedPlayer}
                        refreshSignal={profileRefreshSignal}
                        onUpdateClick={(player) => setUpdatePlayer(player)}
                    />
                </div>
            </section>

            {/* Update skill dialog */}
            {updatePlayer ? (
                <UpdateSkillDialog
                    playerId={updatePlayer.id}
                    playerName={updatePlayer.full_name}
                    onUpdated={(skillLevel) => {
                        setSelectedPlayer((player) =>
                            player?.id === updatePlayer.id
                                ? { ...player, skill_level: skillLevel }
                                : player
                        );
                    }}
                    onClose={() => setUpdatePlayer(null)}
                />
            ) : null}
        </div>
    );
}
