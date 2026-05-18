import type { ChangeEvent, FormEvent, JSX } from "react";
import type { UserResponse } from "@repo/auth";
import type { InfoFormState } from "./ProfileInfoView";
import { ProfileInfoView } from "./ProfileInfoView";
import { User } from "lucide-react";

type Props = {
    user: UserResponse;
    infoForm: InfoFormState;
    infoPreview: string | null;
    infoIsPending: boolean;
    infoApiError: string;
    infoSuccessMessage: string;
    onInfoFormChange: (patch: Partial<InfoFormState>) => void;
    onInfoFileChange: (e: ChangeEvent<HTMLInputElement>) => void;
    onInfoSubmit: (e: FormEvent) => void;
    onInfoDismissError: () => void;
    onInfoDismissSuccess: () => void;
};

export function ProfileView({
    user,
    infoForm,
    infoPreview,
    infoIsPending,
    infoApiError,
    infoSuccessMessage,
    onInfoFormChange,
    onInfoFileChange,
    onInfoSubmit,
    onInfoDismissError,
    onInfoDismissSuccess,
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
                                Manage your personal information
                            </p>
                        </div>
                    </div>
                </header>

                <div className="px-5 py-6 sm:px-6 lg:px-8">
                    <ProfileInfoView
                        user={user}
                        form={infoForm}
                        preview={infoPreview}
                        isPending={infoIsPending}
                        apiError={infoApiError}
                        successMessage={infoSuccessMessage}
                        onFormChange={onInfoFormChange}
                        onFileChange={onInfoFileChange}
                        onSubmit={onInfoSubmit}
                        onDismissError={onInfoDismissError}
                        onDismissSuccess={onInfoDismissSuccess}
                    />
                </div>
            </section>
        </div>
    );
}
