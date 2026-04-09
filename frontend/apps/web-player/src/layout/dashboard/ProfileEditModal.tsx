import type { NotificationChannel, UserResponse } from "@repo/auth";
import { useAuthStore } from "@repo/auth";
import { useUpdateProfile } from "@repo/player-domain";
import { AlertToast } from "@repo/ui";
import { Bell, Loader2, Mail, MessageSquare, Smartphone, Upload, X } from "lucide-react";
import type { ChangeEvent, FormEvent, JSX } from "react";
import { useState } from "react";
import { createPortal } from "react-dom";
import { avatarBgColor } from "./Navbar";

interface ProfileEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: UserResponse | null;
}

function getInitials(name: string): string {
    return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
}

export default function ProfileEditModal({
    isOpen,
    onClose,
    user,
}: ProfileEditModalProps): JSX.Element | null {
    const NOTIFICATION_OPTIONS: { value: NotificationChannel; label: string; icon: JSX.Element }[] =
        [
            { value: "email", label: "Email", icon: <Mail className="w-4 h-4" /> },
            { value: "sms", label: "SMS", icon: <MessageSquare className="w-4 h-4" /> },
            { value: "push", label: "Push", icon: <Bell className="w-4 h-4" /> },
            { value: "in_app", label: "In-App", icon: <Smartphone className="w-4 h-4" /> },
        ];

    const [formData, setFormData] = useState({
        full_name: user?.full_name ?? "",
        phone: user?.phone ?? "",
        photo_url: user?.photo_url ?? "",
        preferred_notification_channel: (user?.preferred_notification_channel ??
            "email") as NotificationChannel,
    });

    const [preview, setPreview] = useState<string | null>(user?.photo_url ?? null);
    const [successMessage, setSuccessMessage] = useState("");
    const [errorMessage, setErrorMessage] = useState("");

    const setUser = useAuthStore((state) => state.setUser);
    const updateMutation = useUpdateProfile();

    const clearMessages = (): void => {
        setSuccessMessage("");
        setErrorMessage("");
    };

    const handleInputChange = (e: ChangeEvent<HTMLInputElement>): void => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        clearMessages();
    };

    const handleFileChange = (e: ChangeEvent<HTMLInputElement>): void => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const result = reader.result as string;
                setPreview(result);
                setFormData((prev) => ({ ...prev, photo_url: result }));
            };
            reader.readAsDataURL(file);
            clearMessages();
        }
    };

    const handleSubmit = async (e: FormEvent): Promise<void> => {
        e.preventDefault();
        clearMessages();
        try {
            await updateMutation.mutateAsync(formData);
            if (user) setUser({ ...user, ...formData });
            setSuccessMessage("Profile updated successfully!");
            setTimeout(onClose, 1500);
        } catch (error) {
            setErrorMessage(
                error instanceof Error
                    ? error.message
                    : "Failed to update profile. Please try again."
            );
        }
    };

    const handleClose = (): void => {
        clearMessages();
        setFormData({
            full_name: user?.full_name ?? "",
            phone: user?.phone ?? "",
            photo_url: user?.photo_url ?? "",
            preferred_notification_channel: (user?.preferred_notification_channel ??
                "email") as NotificationChannel,
        });
        setPreview(user?.photo_url ?? null);
        onClose();
    };

    if (!isOpen || !user) return null;

    return createPortal(
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 overflow-y-auto">
            <div
                className="flex min-h-full items-center justify-center p-4"
                onClick={(e) => e.target === e.currentTarget && handleClose()}
            >
                <div className="bg-background rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-border">
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-5 border-b border-border">
                        <div>
                            <h2 className="text-base font-semibold text-foreground">
                                Edit Profile
                            </h2>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Update your personal information
                            </p>
                        </div>
                        <button
                            onClick={handleClose}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
                        {successMessage && (
                            <AlertToast
                                title={successMessage}
                                variant="success"
                                onClose={() => setSuccessMessage("")}
                            />
                        )}
                        {errorMessage && (
                            <AlertToast
                                title={errorMessage}
                                variant="error"
                                onClose={() => setErrorMessage("")}
                            />
                        )}

                        {/* Avatar */}
                        <div className="flex items-center gap-4">
                            <div
                                className={`w-16 h-16 rounded-full overflow-hidden ${avatarBgColor(user.full_name)} flex items-center justify-center flex-shrink-0 ring-2 ring-offset-2 ring-border`}
                            >
                                {preview ? (
                                    <img
                                        src={preview}
                                        alt="Avatar"
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <span className="text-lg font-bold text-white">
                                        {getInitials(user.full_name)}
                                    </span>
                                )}
                            </div>
                            <div>
                                <label className="cursor-pointer">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleFileChange}
                                        className="hidden"
                                    />
                                    <div
                                        className="flex items-center gap-1.5 px-3 py-1.5 
                      bg-primary/10 hover:bg-primary/15 
                      border border-primary/10 hover:border-primary/15
                      rounded-lg transition-colors"
                                    >
                                        <Upload className="w-3.5 h-3.5 text-muted-foreground" />
                                        <span className="text-xs font-medium text-muted-foreground">
                                            Change photo
                                        </span>
                                    </div>{" "}
                                </label>
                                <p className="text-[11px] text-muted-foreground mt-1.5">
                                    Square image, min 400×400px
                                </p>
                            </div>
                        </div>

                        {/* Name + Phone */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <label
                                    htmlFor="full_name"
                                    className="block text-xs font-medium text-muted-foreground mb-1.5"
                                >
                                    Full Name
                                </label>
                                <input
                                    type="text"
                                    id="full_name"
                                    name="full_name"
                                    value={formData.full_name}
                                    onChange={handleInputChange}
                                    placeholder="Your full name"
                                    className="w-full px-3 py-2 text-sm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring transition-all bg-background text-foreground"
                                />
                            </div>
                            <div className="col-span-2">
                                <label
                                    htmlFor="phone"
                                    className="block text-xs font-medium text-muted-foreground mb-1.5"
                                >
                                    Phone
                                </label>
                                <input
                                    type="tel"
                                    id="phone"
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleInputChange}
                                    placeholder="+1 234 567 890"
                                    className="w-full px-3 py-2 text-sm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring transition-all bg-background text-foreground"
                                />
                            </div>
                        </div>

                        {/* Notification Channel */}
                        <div>
                            <p className="text-xs font-medium text-muted-foreground mb-2">
                                Notification Channel
                            </p>
                            <div className="grid grid-cols-4 gap-2">
                                {NOTIFICATION_OPTIONS.map(({ value, label, icon }) => {
                                    const active =
                                        formData.preferred_notification_channel === value;
                                    return (
                                        <button
                                            key={value}
                                            type="button"
                                            onClick={() => {
                                                setFormData((prev) => ({
                                                    ...prev,
                                                    preferred_notification_channel: value,
                                                }));
                                                clearMessages();
                                            }}
                                            className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border text-xs font-medium transition-all duration-200
                       ${
                           active
                               ? "bg-primary/10 hover:bg-primary/10 text-muted-foreground border border-primary/10 hover:border-primary/10 shadow-sm"
                               : "bg-transparent hover:bg-primary/10 text-muted-foreground hover:border-primary/10 hover:text-muted-foreground"
                       }`}
                                        >
                                            {icon}
                                            {label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Read-only info */}
                        <div className="flex gap-2">
                            <div className="flex-1 bg-primary/5 rounded-xl px-3 py-2.5">
                                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                                    Email
                                </p>
                                <p className="text-sm text-foreground truncate mt-0.5">
                                    {user.email}
                                </p>
                            </div>
                            <div className="bg-primary/5 rounded-xl px-3 py-2.5">
                                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                                    Role
                                </p>
                                <p className="text-sm text-foreground capitalize mt-0.5">
                                    {user.role}
                                </p>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3 pt-1">
                            <button
                                type="button"
                                onClick={handleClose}
                                className="flex-1 px-4 py-2.5 text-sm border border-primary/10 hover:border-primary/10
                font-medium text-muted-foreground rounded-xl hover:bg-primary/10 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={updateMutation.isPending}
                                className="flex-1 px-4 py-2.5 text-sm font-medium bg-cta text-cta-foreground rounded-xl hover:bg-cta-hover focus-visible:ring-2 focus-visible:ring-cta-ring disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
                            >
                                {updateMutation.isPending ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Saving…
                                    </>
                                ) : (
                                    "Save Changes"
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>,
        document.body
    );
}
