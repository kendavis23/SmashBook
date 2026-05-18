import { type FormEvent, type JSX, useCallback, useState } from "react";
import type { NotificationChannel } from "@repo/auth";
import { useAuthStore } from "@repo/auth";
import { useUpdateMyProfile } from "../../hooks";
import { useAuth } from "../../store";
import { ProfileNotificationView } from "./ProfileNotificationView";

export default function NotificationsContainer(): JSX.Element {
    const { user } = useAuth();
    const setUser = useAuthStore((state) => state.setUser);

    const [notifChannel, setNotifChannel] = useState<NotificationChannel>(
        user?.preferred_notification_channel ?? "email"
    );
    const [notifApiError, setNotifApiError] = useState("");
    const [notifSuccessMessage, setNotifSuccessMessage] = useState("");

    const notifMutation = useUpdateMyProfile();

    const handleNotifSubmit = useCallback(
        async (e: FormEvent) => {
            e.preventDefault();
            setNotifApiError("");
            setNotifSuccessMessage("");
            try {
                await notifMutation.mutateAsync({ preferred_notification_channel: notifChannel });
                if (user) setUser({ ...user, preferred_notification_channel: notifChannel });
                setNotifSuccessMessage("Notification settings have been updated.");
            } catch (err) {
                setNotifSuccessMessage("");
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
        <div className="w-full space-y-5">
            <section className="card-surface overflow-hidden">
                <header className="border-b border-border bg-muted/10 px-5 py-4 sm:px-6">
                    <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary text-secondary-foreground shadow-xs">
                            <span className="text-sm">🔔</span>
                        </div>
                        <div>
                            <h1 className="text-lg font-semibold tracking-tight text-foreground">
                                Notifications
                            </h1>
                            <p className="mt-0.5 text-sm text-muted-foreground">
                                Choose your preferred notification channel
                            </p>
                        </div>
                    </div>
                </header>
                <div className="max-w-md px-5 py-6 sm:px-6">
                    <ProfileNotificationView
                        selected={notifChannel}
                        isPending={notifMutation.isPending}
                        apiError={notifApiError}
                        successMessage={notifSuccessMessage}
                        onSelect={(channel) => {
                            setNotifSuccessMessage("");
                            setNotifChannel(channel);
                        }}
                        onSubmit={(e) => void handleNotifSubmit(e)}
                        onDismissError={() => setNotifApiError("")}
                        onDismissSuccess={() => setNotifSuccessMessage("")}
                    />
                </div>
            </section>
        </div>
    );
}
