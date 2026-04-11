import type { Club, ClubSettingsInput, Tab } from "../../types";
import { AlertToast, Breadcrumb } from "@repo/ui";
import { MapPin, Pencil } from "lucide-react";
import type { JSX } from "react";
import ClubSettingsTable from "./ClubDetailSettingsSection";
import PricingRulesTable from "./ClubDetailPricingRulesSection";
import ClubDetailHoursSection from "./ClubDetailHoursSection";
import ClubDetailViewSection from "./ClubDetailViewSection";

type Props = {
    club: Club;
    clubId: string;
    visibleTabs: { id: Tab; label: string }[];
    activeTab: Tab;
    settingsForm: ClubSettingsInput;
    updateSettingsIsPending: boolean;
    updateSettingsIsSuccess: boolean;
    updateSettingsError: Error | null;
    settingsToastDismissed: boolean;
    onTabChange: (tab: Tab) => void;
    onEditOpen: () => void;
    onSettingsChange: (key: keyof ClubSettingsInput, val: unknown) => void;
    onSettingsSave: () => void;
    onSettingsCancel: () => void;
    onSettingsToastDismiss: () => void;
    onNavigateBack: () => void;
};

export default function ClubDetailPageView({
    club,
    clubId,
    visibleTabs,
    activeTab,
    settingsForm,
    updateSettingsIsPending,
    updateSettingsIsSuccess,
    updateSettingsError,
    settingsToastDismissed,
    onTabChange,
    onEditOpen,
    onSettingsChange,
    onSettingsSave,
    onSettingsCancel,
    onSettingsToastDismiss,
    onNavigateBack,
}: Props): JSX.Element {
    return (
        <div className="w-full space-y-4">
            <div className="space-y-5">
                <Breadcrumb
                    items={[{ label: "Clubs", onClick: onNavigateBack }, { label: "Club Profile" }]}
                />
            </div>

            <section className="w-full rounded-xl border border-border bg-card px-6 py-6 shadow-sm sm:px-8">
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
                    <button onClick={onEditOpen} className="btn-ghost-sm shrink-0">
                        <Pencil size={12} /> Edit Club
                    </button>
                </header>

                <div className="mt-4 flex border-b border-border">
                    {visibleTabs.map((t) => (
                        <button
                            key={t.id}
                            onClick={() => onTabChange(t.id)}
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

                <div className="mt-5">
                    {activeTab === "view" && <ClubDetailViewSection club={club} clubId={clubId} />}

                    {activeTab === "settings" && (
                        <div className="space-y-4">
                            {updateSettingsIsSuccess && !settingsToastDismissed ? (
                                <AlertToast
                                    title="Settings saved successfully."
                                    variant="success"
                                    onClose={onSettingsToastDismiss}
                                />
                            ) : null}
                            {updateSettingsError && !settingsToastDismissed ? (
                                <AlertToast
                                    title={updateSettingsError.message}
                                    variant="error"
                                    onClose={onSettingsToastDismiss}
                                />
                            ) : null}
                            <ClubSettingsTable form={settingsForm} onChange={onSettingsChange} />
                            <div className="flex items-center justify-end gap-3 border-t border-border pt-4">
                                <button onClick={onSettingsCancel} className="btn-outline">
                                    Cancel
                                </button>
                                <button
                                    onClick={onSettingsSave}
                                    disabled={updateSettingsIsPending}
                                    className="btn-cta"
                                >
                                    {updateSettingsIsPending ? "Saving…" : "Save Changes"}
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
        </div>
    );
}
