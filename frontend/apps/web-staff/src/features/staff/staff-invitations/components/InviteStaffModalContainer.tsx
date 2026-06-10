import { useCallback, useState } from "react";
import type { FormEvent, JSX } from "react";
import { useCreateStaffInvitation } from "../../hooks";
import { useActiveClubName, useClubAccess } from "../../store";
import type { InviteStaffFormState } from "../../types";
import InviteStaffModalView from "./InviteStaffModalView";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function createDefaultForm(): InviteStaffFormState {
    return { email: "", role: "front_desk" };
}

type Props = {
    onClose: () => void;
    onSuccess: () => void;
};

export default function InviteStaffModalContainer({ onClose, onSuccess }: Props): JSX.Element {
    const { clubId } = useClubAccess();
    const activeClubName = useActiveClubName();
    const [form, setForm] = useState<InviteStaffFormState>(createDefaultForm);
    const [emailError, setEmailError] = useState("");
    const createInvitation = useCreateStaffInvitation(clubId ?? "");
    const apiError = (createInvitation.error as Error | null)?.message ?? "";

    const handleFormChange = useCallback((patch: Partial<InviteStaffFormState>): void => {
        setForm((previous) => ({ ...previous, ...patch }));
        if (patch.email !== undefined) setEmailError("");
    }, []);

    const handleSubmit = useCallback(
        (event: FormEvent): void => {
            event.preventDefault();
            const email = form.email.trim();

            if (!email) {
                setEmailError("Email address is required.");
                return;
            }
            if (!EMAIL_RE.test(email)) {
                setEmailError("Enter a valid email address.");
                return;
            }
            if (!clubId) return;

            createInvitation.mutate(
                {
                    club_id: clubId,
                    email,
                    role: form.role,
                },
                { onSuccess }
            );
        },
        [clubId, createInvitation, form, onSuccess]
    );

    const handleClose = useCallback((): void => {
        createInvitation.reset();
        onClose();
    }, [createInvitation, onClose]);

    return (
        <InviteStaffModalView
            form={form}
            clubName={activeClubName}
            emailError={emailError}
            apiError={apiError}
            isPending={createInvitation.isPending}
            onFormChange={handleFormChange}
            onSubmit={handleSubmit}
            onClose={handleClose}
            onDismissError={() => createInvitation.reset()}
        />
    );
}
