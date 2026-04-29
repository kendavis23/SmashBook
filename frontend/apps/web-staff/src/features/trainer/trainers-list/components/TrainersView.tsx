import type { JSX } from "react";
import { Users, RefreshCw, User, CheckCircle, XCircle } from "lucide-react";
import { Breadcrumb, AlertToast } from "@repo/ui";
import type { Trainer } from "../../types";

type Props = {
    trainers: Trainer[];
    isLoading: boolean;
    error: Error | null;
    canManage: boolean;
    onRefresh: () => void;
    onViewTrainer: (trainer: Trainer) => void;
};

function StatusBadge({ isActive }: { isActive: boolean }): JSX.Element {
    return isActive ? (
        <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2.5 py-0.5 text-[11px] font-medium text-success">
            <CheckCircle size={10} />
            Active
        </span>
    ) : (
        <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2.5 py-0.5 text-[11px] font-medium text-destructive">
            <XCircle size={10} />
            Inactive
        </span>
    );
}

export default function TrainersView({
    trainers,
    isLoading,
    error,
    canManage,
    onRefresh,
    onViewTrainer,
}: Props): JSX.Element {
    return (
        <div className="w-full space-y-5">
            <Breadcrumb items={[{ label: "Trainers" }]} />

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
                                        Trainers
                                    </h1>
                                    {trainers.length > 0 ? (
                                        <span className="rounded-full border border-border bg-background px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground shadow-xs">
                                            {trainers.length} total
                                        </span>
                                    ) : null}
                                </div>
                                <p className="mt-0.5 text-sm text-muted-foreground">
                                    View trainer profiles, availability, and assigned bookings.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                        <button
                            onClick={onRefresh}
                            className="btn-outline min-h-10 px-4"
                            aria-label="Refresh trainers"
                        >
                            <RefreshCw size={14} /> Refresh
                        </button>
                    </div>
                </header>

                <div className="px-5 py-5 sm:px-6">
                    {error ? (
                        <AlertToast
                            title={error.message ?? "Failed to load trainers."}
                            variant="error"
                            onClose={onRefresh}
                        />
                    ) : null}

                    {isLoading ? (
                        <div className="flex items-center justify-center gap-3 py-16">
                            <span className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-cta" />
                            <span className="text-sm text-muted-foreground">Loading trainers…</span>
                        </div>
                    ) : !error && trainers.length === 0 ? (
                        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                                <Users size={22} />
                            </div>
                            <p className="text-sm font-medium text-foreground">No trainers found</p>
                            <p className="text-sm text-muted-foreground">
                                {canManage
                                    ? "Trainers are added via staff management."
                                    : "No trainers are currently assigned to this club."}
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-muted/10">
                                        <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                            Trainer
                                        </th>
                                        <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                            Availability Slots
                                        </th>
                                        <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                            Status
                                        </th>
                                        <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {trainers.map((trainer) => (
                                        <tr
                                            key={trainer.id}
                                            className="border-t border-border hover:bg-muted/20"
                                        >
                                            <td className="px-3 py-3">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
                                                        <User size={14} />
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-foreground">
                                                            Trainer #{trainer.id.slice(0, 8)}
                                                        </p>
                                                        {trainer.bio ? (
                                                            <p className="mt-0.5 max-w-xs truncate text-xs text-muted-foreground">
                                                                {trainer.bio}
                                                            </p>
                                                        ) : (
                                                            <p className="mt-0.5 text-xs text-muted-foreground">
                                                                No bio provided
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-3 py-3">
                                                <span className="text-sm text-foreground">
                                                    {trainer.availability.length} slot
                                                    {trainer.availability.length !== 1 ? "s" : ""}
                                                </span>
                                            </td>
                                            <td className="px-3 py-3">
                                                <StatusBadge isActive={trainer.is_active} />
                                            </td>
                                            <td className="px-3 py-3">
                                                <button
                                                    onClick={() => onViewTrainer(trainer)}
                                                    className="btn-outline px-3 py-1.5 text-xs"
                                                >
                                                    View
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}
