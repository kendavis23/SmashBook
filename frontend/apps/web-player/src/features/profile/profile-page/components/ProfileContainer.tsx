import { type ChangeEvent, type FormEvent, type JSX, useCallback, useState } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import type { NotificationChannel } from "@repo/auth";
import { useAuthStore } from "@repo/auth";
import { useUpdateMyProfile, useMyMembership } from "../../hooks";
import { useAuth } from "../../store";
import type { ProfileTab } from "../../types";
import type { InfoFormState } from "./ProfileInfoView";
import { ProfileView } from "./ProfileView";

const VALID_TABS = new Set<ProfileTab>(["info", "notification", "payment", "membership"]);

function parseTab(value: string | undefined): ProfileTab {
    return value && VALID_TABS.has(value as ProfileTab) ? (value as ProfileTab) : "info";
}

export default function ProfileContainer(): JSX.Element {
    const { user, clubId } = useAuth();
    const setUser = useAuthStore((state) => state.setUser);
    const navigate = useNavigate();
    const location = useRouterState({ select: (s) => s.location });
    const searchParams = new URLSearchParams(location.searchStr);

    const activeTab = parseTab(searchParams.get("tab") ?? undefined);
    const [hasMembershipTabLoaded, setHasMembershipTabLoaded] = useState(
        activeTab === "membership"
    );

    // Info tab state
    const [infoForm, setInfoForm] = useState<InfoFormState>({
        full_name: user?.full_name ?? "",
        phone: user?.phone ?? "",
        photo_url: user?.photo_url ?? "",
    });
    const [infoPreview, setInfoPreview] = useState<string | null>(user?.photo_url ?? null);
    const [infoApiError, setInfoApiError] = useState("");

    // Notification tab state
    const [notifChannel, setNotifChannel] = useState<NotificationChannel>(
        user?.preferred_notification_channel ?? "email"
    );
    const [notifApiError, setNotifApiError] = useState("");

    const updateProfile = useUpdateMyProfile();
    const notifMutation = useUpdateMyProfile();
    const {
        data: membership,
        isLoading: membershipLoading,
        error: membershipError,
    } = useMyMembership(clubId ?? "", { enabled: hasMembershipTabLoaded });

    const handleTabChange = useCallback(
        (tab: ProfileTab) => {
            const next = new URLSearchParams(location.searchStr);
            if (tab === "info") {
                next.delete("tab");
            } else {
                next.set("tab", tab);
            }
            const search = next.toString();
            void navigate({
                to: location.pathname,
                search: search ? Object.fromEntries(next.entries()) : {},
                replace: true,
            });
            if (tab === "membership") {
                setHasMembershipTabLoaded(true);
            }
        },
        [navigate, location]
    );

    const handleInfoFileChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onloadend = () => {
            const result = reader.result as string;
            setInfoPreview(result);
            setInfoForm((prev) => ({ ...prev, photo_url: result }));
        };
        reader.readAsDataURL(file);
    }, []);

    const handleInfoSubmit = useCallback(
        async (e: FormEvent) => {
            e.preventDefault();
            setInfoApiError("");
            try {
                await updateProfile.mutateAsync(infoForm);
                if (user) setUser({ ...user, ...infoForm });
            } catch (err) {
                setInfoApiError(
                    (err as { message?: string })?.message ?? "Failed to update profile."
                );
            }
        },
        [infoForm, updateProfile, user, setUser]
    );

    const handleNotifSubmit = useCallback(
        async (e: FormEvent) => {
            e.preventDefault();
            setNotifApiError("");
            try {
                await notifMutation.mutateAsync({ preferred_notification_channel: notifChannel });
                if (user) setUser({ ...user, preferred_notification_channel: notifChannel });
            } catch (err) {
                setNotifApiError(
                    (err as { message?: string })?.message ??
                        "Failed to update notification settings."
                );
            }
        },
        [notifChannel, notifMutation, user, setUser]
    );

    if (!user) {
        return (
            <div className="flex items-center justify-center py-32">
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-cta" />
            </div>
        );
    }

    return (
        <ProfileView
            user={user}
            activeTab={activeTab}
            infoForm={infoForm}
            infoPreview={infoPreview}
            infoIsPending={updateProfile.isPending}
            infoApiError={infoApiError}
            notifChannel={notifChannel}
            notifIsPending={notifMutation.isPending}
            notifApiError={notifApiError}
            membership={membership ?? null}
            membershipLoading={membershipLoading}
            membershipError={membershipError}
            onTabChange={handleTabChange}
            onInfoFormChange={(patch) => setInfoForm((prev) => ({ ...prev, ...patch }))}
            onInfoFileChange={handleInfoFileChange}
            onInfoSubmit={(e) => void handleInfoSubmit(e)}
            onInfoDismissError={() => setInfoApiError("")}
            onNotifSelect={setNotifChannel}
            onNotifSubmit={(e) => void handleNotifSubmit(e)}
            onNotifDismissError={() => setNotifApiError("")}
        />
    );
}
