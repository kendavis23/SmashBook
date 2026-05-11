import type { ChangeEvent, FormEvent, JSX } from "react";
import type { UserResponse, NotificationChannel } from "@repo/auth";
import type { ProfileTab, MembershipSubscription } from "../../types";
import type { InfoFormState } from "./ProfileInfoView";
import { ProfileInfoView } from "./ProfileInfoView";
import { ProfileNotificationView } from "./ProfileNotificationView";
import { ProfilePaymentView } from "./ProfilePaymentView";
import { ProfileMembershipView } from "./ProfileMembershipView";
import { BadgeCheck, Bell, CreditCard, User } from "lucide-react";

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
    membership: MembershipSubscription | null;
    membershipLoading: boolean;
    membershipError: Error | null;
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
    membership,
    membershipLoading,
    membershipError,
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

                {/* Tabs */}
                <div className="border-b border-border px-5 sm:px-6">
                    <nav className="flex gap-1" aria-label="Profile tabs">
                        {(
                            [
                                { id: "info", label: "Account", icon: <User size={14} /> },
                                { id: "payment", label: "Billing", icon: <CreditCard size={14} /> },
                                {
                                    id: "membership",
                                    label: "Membership",
                                    icon: <BadgeCheck size={14} />,
                                },
                            ] as const
                        ).map(({ id, label, icon }) => (
                            <button
                                key={id}
                                type="button"
                                onClick={() => onTabChange(id)}
                                className={`flex items-center gap-1.5 border-b-2 px-3 py-3 text-sm font-medium transition-colors
                                    ${
                                        activeTab === id
                                            ? "border-cta text-cta"
                                            : "border-transparent text-muted-foreground hover:text-foreground"
                                    }`}
                            >
                                {icon}
                                {label}
                            </button>
                        ))}
                    </nav>
                </div>

                <div className="px-5 py-6 sm:px-6">
                    {activeTab === "payment" ? (
                        <ProfilePaymentView />
                    ) : activeTab === "membership" ? (
                        <ProfileMembershipView
                            membership={membership}
                            isLoading={membershipLoading}
                            error={membershipError}
                        />
                    ) : (
                        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
                            <section className="rounded-xl border border-border bg-background p-4 shadow-xs sm:p-5">
                                <div className="mb-5 flex items-center gap-3 border-b border-border pb-4">
                                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                                        <User size={15} />
                                    </span>
                                    <div>
                                        <h2 className="text-sm font-semibold text-foreground">
                                            Personal Info
                                        </h2>
                                        <p className="text-xs text-muted-foreground">
                                            Basic account details and profile photo
                                        </p>
                                    </div>
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
                            </section>

                            <section className="rounded-xl border border-border bg-background p-4 shadow-xs sm:p-5">
                                <div className="mb-5 flex items-center gap-3 border-b border-border pb-4">
                                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                                        <Bell size={15} />
                                    </span>
                                    <div>
                                        <h2 className="text-sm font-semibold text-foreground">
                                            Notifications
                                        </h2>
                                        <p className="text-xs text-muted-foreground">
                                            Choose your preferred channel
                                        </p>
                                    </div>
                                </div>
                                <ProfileNotificationView
                                    selected={notifChannel}
                                    isPending={notifIsPending}
                                    apiError={notifApiError}
                                    onSelect={onNotifSelect}
                                    onSubmit={onNotifSubmit}
                                    onDismissError={onNotifDismissError}
                                />
                            </section>
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}
