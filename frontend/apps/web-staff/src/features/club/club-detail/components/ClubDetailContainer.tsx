import { useGetClub, useUpdateClubSettings } from "../../hooks";
import { useClubAccess } from "../../store";
import type { Club, ClubSettingsInput, Tab } from "../../types";
import { TABS } from "../../types";
import { AlertToast } from "@repo/ui";
import { useNavigate, useParams } from "@tanstack/react-router";
import { type JSX, useMemo, useState, useEffect } from "react";
import ClubDetailView from "./ClubDetailPageView";
import ClubModal from "../../components/ClubModal";

export default function ClubDetailContainer(): JSX.Element {
    const { clubId } = useParams({ strict: false }) as { clubId: string };
    const navigate = useNavigate();
    const { role } = useClubAccess();

    const canManage = role === "owner" || role === "admin";
    const visibleTabs = TABS.filter((t) => t.id === "view" || canManage);

    const [tab, setTab] = useState<Tab>("view");
    const [editOpen, setEditOpen] = useState(false);
    const [clubSuccessMsg, setClubSuccessMsg] = useState("");
    const [settingsOverrides, setSettingsOverrides] = useState<ClubSettingsInput>({});
    const [settingsToastDismissed, setSettingsToastDismissed] = useState(false);

    const { data, isLoading, error } = useGetClub(clubId);
    const club = data as Club | undefined;
    const updateSettings = useUpdateClubSettings(clubId);

    useEffect(() => {
        setSettingsToastDismissed(false);
    }, [updateSettings.isSuccess, updateSettings.error]);

    const activeTab = visibleTabs.some((t) => t.id === tab) ? tab : "view";

    const settingsForm = useMemo<ClubSettingsInput>(
        () =>
            ({
                ...(data ?? ({} as ClubSettingsInput)),
                ...settingsOverrides,
            }) as ClubSettingsInput,
        [data, settingsOverrides]
    );

    function handleSettingsChange(key: keyof ClubSettingsInput, val: unknown): void {
        setSettingsOverrides((prev) => ({ ...prev, [key]: val }));
    }

    function handleSettingsSave(): void {
        updateSettings.mutate(settingsForm, {
            onSuccess: () => setSettingsOverrides({}),
        });
    }

    function handleSettingsCancel(): void {
        setSettingsOverrides({});
    }

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
        <>
            <ClubDetailView
                club={club}
                clubId={clubId}
                visibleTabs={visibleTabs}
                activeTab={activeTab}
                settingsForm={settingsForm}
                updateSettingsIsPending={updateSettings.isPending}
                updateSettingsIsSuccess={updateSettings.isSuccess}
                updateSettingsError={updateSettings.error as Error | null}
                settingsToastDismissed={settingsToastDismissed}
                onTabChange={setTab}
                onEditOpen={() => setEditOpen(true)}
                onSettingsChange={handleSettingsChange}
                onSettingsSave={handleSettingsSave}
                onSettingsCancel={handleSettingsCancel}
                onSettingsToastDismiss={() => setSettingsToastDismissed(true)}
                onNavigateBack={() => void navigate({ to: "/clubs" })}
            />
            {clubSuccessMsg ? (
                <AlertToast
                    title={clubSuccessMsg}
                    variant="success"
                    onClose={() => setClubSuccessMsg("")}
                />
            ) : null}
            {editOpen ? (
                <ClubModal
                    initialData={club}
                    onClose={() => setEditOpen(false)}
                    onSuccess={setClubSuccessMsg}
                />
            ) : null}
        </>
    );
}
