import { Breadcrumb, AlertToast } from "@repo/ui";
import { Users, RefreshCw, UserPlus } from "lucide-react";
import type { JSX } from "react";

type Props = {
    canRegister: boolean;
    onRefresh: () => void;
    onRegisterClick: () => void;
    registerSuccessMsg: string;
    onDismissSuccess: () => void;
};

export default function PlayersView({
    canRegister,
    onRefresh,
    onRegisterClick,
    registerSuccessMsg,
    onDismissSuccess,
}: Props): JSX.Element {
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
                                </div>
                                <p className="mt-0.5 text-sm text-muted-foreground">
                                    Manage your club&apos;s players
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                        <button
                            onClick={onRefresh}
                            className="btn-outline min-h-10 px-4"
                            aria-label="Refresh players"
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

                <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
                    <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                        <Users size={24} className="text-muted-foreground/40" />
                    </div>
                    <h3 className="text-sm font-semibold text-foreground">No players yet</h3>
                    <p className="mt-1.5 max-w-xs text-xs text-muted-foreground">
                        Register your first player to get started.
                    </p>
                    {canRegister ? (
                        <button onClick={onRegisterClick} className="btn-cta mt-5">
                            <UserPlus size={14} /> Register Player
                        </button>
                    ) : null}
                </div>
            </section>
        </div>
    );
}
