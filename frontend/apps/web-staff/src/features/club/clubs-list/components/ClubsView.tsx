import type { Club } from "../../types";
import { Breadcrumb } from "@repo/ui";
import { Building2, Plus, RefreshCw, Settings, Search } from "lucide-react";
import type { JSX } from "react";

type Props = {
    clubs: Club[];
    search: string;
    isLoading: boolean;
    error: Error | null;
    onSearchChange: (value: string) => void;
    onRefresh: () => void;
    onCreateClick: () => void;
    onManageClub: (id: string) => void;
};

export default function ClubsView({
    clubs,
    search,
    isLoading,
    error,
    onSearchChange,
    onRefresh,
    onCreateClick,
    onManageClub,
}: Props): JSX.Element {
    const activeCount = clubs.length;

    return (
        <div className="w-full space-y-5">
            <Breadcrumb items={[{ label: "Clubs" }]} />

            <section className="card-surface overflow-hidden">
                <header className="flex flex-col gap-4 border-b border-border px-5 py-5 sm:px-6 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                        <h1 className="text-xl font-semibold tracking-tight text-foreground">
                            Clubs
                        </h1>
                        <p className="mt-1 text-sm text-muted-foreground">
                            {clubs.length > 0
                                ? `${activeCount} total`
                                : "Manage your organisation's clubs"}
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                        <button
                            onClick={onRefresh}
                            className="btn-outline min-h-11 px-4"
                            aria-label="Refresh clubs"
                        >
                            <RefreshCw size={14} /> Refresh
                        </button>
                        <button onClick={onCreateClick} className="btn-cta min-h-11 px-4">
                            <Plus size={14} /> New Club
                        </button>
                    </div>
                </header>

                <div className="border-b border-border bg-muted/20 px-5 py-4 sm:px-6">
                    <div className="mb-3 flex items-center gap-2">
                        <Search size={13} className="text-muted-foreground" />
                        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Filters
                        </span>
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]">
                        <div className="flex flex-col gap-1">
                            <span className="text-[11px] font-medium text-muted-foreground">
                                Search
                            </span>
                            <div className="relative flex items-center">
                                <div className="flex w-full max-w-xs items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 shadow-xs transition focus-within:border-cta focus-within:ring-2 focus-within:ring-cta-ring/30">
                                    <Search size={13} className="shrink-0 text-muted-foreground" />
                                    <input
                                        type="text"
                                        placeholder="Search clubs…"
                                        className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                                        value={search}
                                        onChange={(e) => onSearchChange(e.target.value)}
                                    />
                                    {search && (
                                        <button
                                            type="button"
                                            onClick={() => onSearchChange("")}
                                            className="text-muted-foreground hover:text-foreground"
                                            aria-label="Clear search"
                                        >
                                            ×
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {isLoading ? (
                    <div className="flex items-center gap-2.5 px-5 py-10 text-[13px] text-muted-foreground">
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-border border-t-cta" />
                        Loading clubs…
                    </div>
                ) : error ? (
                    <div className="m-5 feedback-error">{error.message}</div>
                ) : clubs.length === 0 ? (
                    <section className="px-6 py-16 text-center">
                        <Building2 size={32} className="mx-auto mb-3 text-muted-foreground/30" />
                        <h3 className="text-[15px] font-semibold text-foreground">
                            {search ? "No clubs match your search" : "No clubs yet"}
                        </h3>
                        <p className="mx-auto mt-1.5 max-w-sm text-[13px] text-muted-foreground">
                            {search
                                ? "Try a different search term."
                                : "Create your first club to start managing courts, bookings, and players."}
                        </p>
                        {!search ? (
                            <button onClick={onCreateClick} className="btn-cta mt-5">
                                <Plus size={14} /> New Club
                            </button>
                        ) : null}
                    </section>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-border bg-muted/20">
                                    <th className="table-th">Name</th>
                                    <th className="table-th">Address</th>
                                    <th className="table-th">Currency</th>
                                    <th className="table-th text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {clubs.map((club) => (
                                    <tr key={club.id} className="table-row-hover">
                                        <td className="table-td font-medium">{club.name}</td>
                                        <td className="table-td text-muted-foreground">
                                            {club.address ?? (
                                                <span className="text-muted-foreground/30">—</span>
                                            )}
                                        </td>
                                        <td className="table-td">
                                            <span className="rounded-md bg-secondary px-2 py-0.5 text-[11px] font-medium text-secondary-foreground">
                                                {club.currency}
                                            </span>
                                        </td>
                                        <td className="table-td">
                                            <div className="flex items-center justify-end">
                                                <button
                                                    onClick={() => onManageClub(club.id)}
                                                    className="btn-ghost-sm"
                                                >
                                                    <Settings size={11} /> Manage
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>
        </div>
    );
}
