import { type ChangeEvent, type FormEvent, type JSX, useCallback, useState } from "react";
import { useAuthStore } from "@repo/auth";
import { useUpdateMyProfile } from "../../hooks";
import { useAuth } from "../../store";
import type { InfoFormState } from "./ProfileInfoView";
import { ProfileView } from "./ProfileView";

export default function ProfileContainer(): JSX.Element {
    const { user } = useAuth();
    const setUser = useAuthStore((state) => state.setUser);

    const [infoForm, setInfoForm] = useState<InfoFormState>({
        full_name: user?.full_name ?? "",
        phone: user?.phone ?? "",
        photo_url: user?.photo_url ?? "",
    });
    const [infoPreview, setInfoPreview] = useState<string | null>(user?.photo_url ?? null);
    const [infoApiError, setInfoApiError] = useState("");
    const [infoSuccessMessage, setInfoSuccessMessage] = useState("");

    const updateProfile = useUpdateMyProfile();

    const handleInfoFileChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onloadend = () => {
            const result = reader.result as string;
            setInfoSuccessMessage("");
            setInfoPreview(result);
            setInfoForm((prev) => ({ ...prev, photo_url: result }));
        };
        reader.readAsDataURL(file);
    }, []);

    const handleInfoSubmit = useCallback(
        async (e: FormEvent) => {
            e.preventDefault();
            setInfoApiError("");
            setInfoSuccessMessage("");
            try {
                await updateProfile.mutateAsync(infoForm);
                if (user) setUser({ ...user, ...infoForm });
                setInfoSuccessMessage("Profile has been updated.");
            } catch (err) {
                setInfoSuccessMessage("");
                setInfoApiError(
                    (err as { message?: string })?.message ?? "Failed to update profile."
                );
            }
        },
        [infoForm, updateProfile, user, setUser]
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
            infoForm={infoForm}
            infoPreview={infoPreview}
            infoIsPending={updateProfile.isPending}
            infoApiError={infoApiError}
            infoSuccessMessage={infoSuccessMessage}
            onInfoFormChange={(patch) => {
                setInfoSuccessMessage("");
                setInfoForm((prev) => ({ ...prev, ...patch }));
            }}
            onInfoFileChange={handleInfoFileChange}
            onInfoSubmit={(e) => void handleInfoSubmit(e)}
            onInfoDismissError={() => setInfoApiError("")}
            onInfoDismissSuccess={() => setInfoSuccessMessage("")}
        />
    );
}
