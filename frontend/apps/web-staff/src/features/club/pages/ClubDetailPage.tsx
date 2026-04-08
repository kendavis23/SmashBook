import { useGetClub, useUpdateClubSettings } from "../hooks";
import { useClubAccess } from "../store";
import type { Club, ClubSettingsInput } from "../types";
import { AlertToast, Breadcrumb } from "@repo/ui";
import { useNavigate, useParams } from "@tanstack/react-router";
import { MapPin, Pencil } from "lucide-react";
import { type JSX, useMemo, useState, useEffect } from "react";

import ClubSettingsTable from "../components/ClubDetailSettingsSection";
import PricingRulesTable from "../components/ClubDetailPricingRulesSection";
import ClubDetailHoursSection from "../components/ClubDetailHoursSection";
import ClubDetailViewSection from "../components/ClubDetailViewSection";
import ClubModal from "../components/ClubModal";

type Tab = "view" | "settings" | "hours" | "pricing";

const TABS: { id: Tab; label: string }[] = [
    { id: "view", label: "View" },
    { id: "settings", label: "Settings" },
    { id: "hours", label: "Operating Hours" },
    { id: "pricing", label: "Pricing Rules" },
];

export default function ClubDetailPage(): JSX.Element {
    const { clubId } = useParams({ strict: false }) as { clubId: string };
    const navigate = useNavigate();
    const { role } = useClubAccess();

    const canManage = role === "owner" || role === "admin";
    const visibleTabs = TABS.filter((t) => t.id === "view" || canManage);

    const [tab, setTab] = useState<Tab>("view");
    const [editOpen, setEditOpen] = useState(false);
    const [clubSuccessMsg, setClubSuccessMsg] = useState("");

    // If active tab is no longer visible (role changed), fall back to "view"
    const activeTab = visibleTabs.some((t) => t.id === tab) ? tab : "view";

    const { data, isLoading, error } = useGetClub(clubId);
    const club = data as Club | undefined;

    // Settings tab state
    const [settingsOverrides, setSettingsOverrides] = useState<ClubSettingsInput>({});
    const [settingsToastDismissed, setSettingsToastDismissed] = useState(false);
    const updateSettings = useUpdateClubSettings(clubId);

    useEffect(() => {
        setSettingsToastDismissed(false);
    }, [updateSettings.isSuccess, updateSettings.error]);
    const settingsForm = useMemo<ClubSettingsInput>(
        () =>
            ({
                ...(data ?? ({} as ClubSettingsInput)),
                ...settingsOverrides,
            }) as ClubSettingsInput,
        [data, settingsOverrides]
    );

    if (isLoading) {
        return (
            <div className="w-full">
                <section className="flex min-h-[320px] flex-col items-center justify-center rounded-xl border border-border bg-card shadow-sm">
                    <span className="h-10 w-10 animate-spin rounded-full border-2 border-border border-t-cta" />
                    <p className="mt-4 text-sm font-medium text-foreground">Loading club…</p>
                </section>
            </div>
        );
    }

    if (error || !club) {
        return (
            <div className="w-full">
                <p className="feedback-error">
                    {error ? (error as Error).message : "Club not found."}
                </p>
            </div>
        );
    }

    return (
        <div className="w-full space-y-4">
            {/* Breadcrumb + Page title */}
            <div className="space-y-5">
                <Breadcrumb
                    items={[
                        { label: "Clubs", onClick: () => void navigate({ to: "/clubs" }) },
                        { label: "Club Profile" },
                    ]}
                />
            </div>

            <section className="w-full rounded-xl border border-border bg-card px-6 py-6 shadow-sm sm:px-8">
                {/* Header */}
                <header className="flex flex-col gap-3 border-b border-border pb-5 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <h1 className="text-xl font-semibold text-foreground">{club.name}</h1>
                        {club.address ? (
                            <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                                <MapPin size={13} /> {club.address}
                            </p>
                        ) : null}
                        <p className="mt-0.5 text-xs text-muted-foreground/60">
                            Currency: {club.currency}
                        </p>
                    </div>
                    <button onClick={() => setEditOpen(true)} className="btn-ghost-sm shrink-0">
                        <Pencil size={12} /> Edit Club
                    </button>
                </header>

                {/* Tab bar */}
                <div className="mt-4 flex border-b border-border">
                    {visibleTabs.map((t) => (
                        <button
                            key={t.id}
                            onClick={() => setTab(t.id)}
                            className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition ${
                                activeTab === t.id
                                    ? "border-cta text-cta"
                                    : "border-transparent text-muted-foreground hover:text-foreground"
                            }`}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>

                {/* Tab content */}
                <div className="mt-5">
                    {activeTab === "view" && <ClubDetailViewSection club={club} clubId={clubId} />}

                    {activeTab === "settings" && (
                        <div className="space-y-4">
                            {updateSettings.isSuccess && !settingsToastDismissed ? (
                                <AlertToast title="Settings saved successfully." variant="success" onClose={() => setSettingsToastDismissed(true)} />
                            ) : null}
                            {updateSettings.error && !settingsToastDismissed ? (
                                <AlertToast
                                    title={(updateSettings.error as Error).message}
                                    variant="error"
                                    onClose={() => setSettingsToastDismissed(true)}
                                />
                            ) : null}
                            <ClubSettingsTable
                                form={settingsForm}
                                onChange={(key, val) =>
                                    setSettingsOverrides((prev) => ({ ...prev, [key]: val }))
                                }
                            />
                            <div className="flex items-center justify-end gap-3 border-t border-border pt-4">
                                <button
                                    onClick={() => setSettingsOverrides({})}
                                    className="btn-outline"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() =>
                                        updateSettings.mutate(settingsForm, {
                                            onSuccess: () => setSettingsOverrides({}),
                                        })
                                    }
                                    disabled={updateSettings.isPending}
                                    className="btn-cta"
                                >
                                    {updateSettings.isPending ? "Saving…" : "Save Changes"}
                                </button>
                            </div>
                        </div>
                    )}

                    {activeTab === "hours" && <ClubDetailHoursSection clubId={clubId} />}

                    {activeTab === "pricing" && (
                        <PricingRulesTable clubId={clubId} currency={club.currency} />
                    )}
                </div>
            </section>

            {clubSuccessMsg ? <AlertToast title={clubSuccessMsg} variant="success" onClose={() => setClubSuccessMsg("")} /> : null}
            {editOpen ? <ClubModal initialData={club} onClose={() => setEditOpen(false)} onSuccess={setClubSuccessMsg} /> : null}
        </div>
    );
}
