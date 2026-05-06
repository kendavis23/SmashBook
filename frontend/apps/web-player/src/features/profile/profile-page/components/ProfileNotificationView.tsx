import type { FormEvent, JSX } from "react";
import type { NotificationChannel } from "@repo/auth";
import { AlertToast } from "@repo/ui";
import { Bell, Mail, MessageSquare, Smartphone } from "lucide-react";

const NOTIFICATION_OPTIONS: {
    value: NotificationChannel;
    label: string;
    description: string;
    icon: JSX.Element;
}[] = [
    {
        value: "email",
        label: "Email",
        description: "Inbox updates",
        icon: <Mail size={20} />,
    },
    {
        value: "sms",
        label: "SMS",
        description: "Text to your phone",
        icon: <MessageSquare size={20} />,
    },
    {
        value: "push",
        label: "Push",
        description: "Device alerts",
        icon: <Bell size={20} />,
    },
    {
        value: "in_app",
        label: "In-App",
        description: "While you browse",
        icon: <Smartphone size={20} />,
    },
];

type Props = {
    selected: NotificationChannel;
    isPending: boolean;
    apiError: string;
    onSelect: (channel: NotificationChannel) => void;
    onSubmit: (e: FormEvent) => void;
    onDismissError: () => void;
};

export function ProfileNotificationView({
    selected,
    isPending,
    apiError,
    onSelect,
    onSubmit,
    onDismissError,
}: Props): JSX.Element {
    return (
        <form onSubmit={onSubmit} noValidate className="flex h-full flex-col space-y-5">
            {apiError ? (
                <AlertToast title={apiError} variant="error" onClose={onDismissError} />
            ) : null}

            <div>
                <p className="text-xs font-medium text-muted-foreground">Notification Channel</p>
                <p className="mt-0.5 text-sm text-muted-foreground">
                    Choose how you want to receive notifications.
                </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
                {NOTIFICATION_OPTIONS.map(({ value, label, description, icon }) => {
                    const active = selected === value;
                    return (
                        <button
                            key={value}
                            type="button"
                            onClick={() => onSelect(value)}
                            className={`group relative flex flex-col items-center gap-2.5 rounded-xl border px-3 py-4 text-center transition-all duration-150
                                ${
                                    active
                                        ? "border-cta bg-cta/10 ring-1 ring-cta/30"
                                        : "border-border bg-background hover:border-cta/40 hover:bg-cta/5"
                                }`}
                        >
                            {active && (
                                <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-cta" />
                            )}
                            <span
                                className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors duration-150
                                    ${active ? "bg-cta text-white" : "bg-muted text-muted-foreground group-hover:bg-cta/10 group-hover:text-cta"}`}
                            >
                                {icon}
                            </span>
                            <span className="space-y-0.5">
                                <span className={`block text-sm font-semibold ${active ? "text-cta" : "text-foreground"}`}>
                                    {label}
                                </span>
                                <span className="block text-xs text-muted-foreground">
                                    {description}
                                </span>
                            </span>
                        </button>
                    );
                })}
            </div>

            <div className="mt-auto pt-1">
                <button
                    type="submit"
                    disabled={isPending}
                    className="btn-cta min-h-9 w-full px-5 text-sm"
                >
                    {isPending ? "Saving…" : "Save changes"}
                </button>
            </div>
        </form>
    );
}
