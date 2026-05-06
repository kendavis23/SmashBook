import type { ChangeEvent, FormEvent, JSX } from "react";
import type { UserResponse, NotificationChannel } from "@repo/auth";
import type { ProfileTab } from "../../types";
import type { InfoFormState } from "./ProfileInfoView";
import { ProfileInfoView } from "./ProfileInfoView";
import { ProfileNotificationView } from "./ProfileNotificationView";
import { ProfilePaymentView } from "./ProfilePaymentView";
import { Bell, CreditCard, User } from "lucide-react";

type Props = {
    user: UserResponse;
    activeTab: ProfileTab;
    infoForm: InfoFormState;
    infoPreview: string | null;
    infoIsPending: boolean;
    infoApiError: string;
    notifChannel: NotificationChannel;
    notifIsPending: boolean;
    notifApiError: string;
    onTabChange: (tab: ProfileTab) => void;
    onInfoFormChange: (patch: Partial<InfoFormState>) => void;
    onInfoFileChange: (e: ChangeEvent<HTMLInputElement>) => void;
    onInfoSubmit: (e: FormEvent) => void;
    onInfoDismissError: () => void;
    onNotifSelect: (channel: NotificationChannel) => void;
    onNotifSubmit: (e: FormEvent) => void;
    onNotifDismissError: () => void;
};

export function ProfileView({
    user,
    activeTab,
    infoForm,
    infoPreview,
    infoIsPending,
    infoApiError,
    notifChannel,
    notifIsPending,
    notifApiError,
    onTabChange,
    onInfoFormChange,
    onInfoFileChange,
    onInfoSubmit,
    onInfoDismissError,
    onNotifSelect,
    onNotifSubmit,
    onNotifDismissError,
}: Props): JSX.Element {
    return (
        <div className="w-full space-y-5">
            <section className="card-surface overflow-hidden">
                <header className="border-b border-border bg-muted/10 px-5 py-4 sm:px-6">
                    <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary text-secondary-foreground shadow-xs">
                            <User size={16} />
                        </div>
                        <div>
                            <h1 className="text-lg font-semibold tracking-tight text-foreground">
                                Profile
                            </h1>
                            <p className="mt-0.5 text-sm text-muted-foreground">
                                Manage your account settings
                            </p>
                        </div>
                    </div>
                </header>

                {/* Tab — only Payment tab shown; info+notifications are always side-by-side */}
                <div className="border-b border-border px-5 sm:px-6">
                    <nav className="flex gap-1" aria-label="Profile tabs">
                        <button
                            type="button"
                            onClick={() => onTabChange("info")}
                            className={`flex items-center gap-1.5 border-b-2 px-3 py-3 text-sm font-medium transition-colors
                                ${activeTab !== "payment"
                                    ? "border-cta text-cta"
                                    : "border-transparent text-muted-foreground hover:text-foreground"
                                }`}
                        >
                            <User size={14} />
                            Account
                        </button>
                        <button
                            type="button"
                            onClick={() => onTabChange("payment")}
                            className={`flex items-center gap-1.5 border-b-2 px-3 py-3 text-sm font-medium transition-colors
                                ${activeTab === "payment"
                                    ? "border-cta text-cta"
                                    : "border-transparent text-muted-foreground hover:text-foreground"
                                }`}
                        >
                            <CreditCard size={14} />
                            Payment
                        </button>
                    </nav>
                </div>

                <div className="px-5 py-6 sm:px-6">
                    {activeTab === "payment" ? (
                        <ProfilePaymentView />
                    ) : (
                        /* Info + Notifications side by side */
                        <div className="flex flex-col gap-8 lg:flex-row">
                            {/* Left — personal info */}
                            <div className="flex-1">
                                <div className="mb-4 flex items-center gap-2">
                                    <User size={14} className="text-muted-foreground" />
                                    <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                                        Personal Info
                                    </p>
                                </div>
                                <ProfileInfoView
                                    user={user}
                                    form={infoForm}
                                    preview={infoPreview}
                                    isPending={infoIsPending}
                                    apiError={infoApiError}
                                    onFormChange={onInfoFormChange}
                                    onFileChange={onInfoFileChange}
                                    onSubmit={onInfoSubmit}
                                    onDismissError={onInfoDismissError}
                                />
                            </div>

                            {/* Divider */}
                            <div className="border-t border-border lg:border-l lg:border-t-0" />

                            {/* Right — notifications */}
                            <div className="flex-1">
                                <div className="mb-4 flex items-center gap-2">
                                    <Bell size={14} className="text-muted-foreground" />
                                    <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                                        Notifications
                                    </p>
                                </div>
                                <ProfileNotificationView
                                    selected={notifChannel}
                                    isPending={notifIsPending}
                                    apiError={notifApiError}
                                    onSelect={onNotifSelect}
                                    onSubmit={onNotifSubmit}
                                    onDismissError={onNotifDismissError}
                                />
                            </div>
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}
