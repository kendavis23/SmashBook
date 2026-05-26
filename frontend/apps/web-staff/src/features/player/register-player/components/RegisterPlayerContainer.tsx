import { useState, useCallback } from "react";
import type { FormEvent, JSX } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useInviteNewPlayer } from "../../hooks";
import { useClubAccess } from "../../store";
import { useListClubs } from "../../../club/hooks";
import RegisterPlayerView from "./RegisterPlayerView";
import type { RegisterPlayerFormState } from "./RegisterPlayerView";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function createDefaultForm(): RegisterPlayerFormState {
    return { fullName: "", email: "" };
}

export default function RegisterPlayerContainer(): JSX.Element {
    const navigate = useNavigate();
    const { clubId } = useClubAccess();
    const { data: clubs = [] } = useListClubs();

    const [form, setForm] = useState<RegisterPlayerFormState>(createDefaultForm);
    const [fullNameError, setFullNameError] = useState("");
    const [emailError, setEmailError] = useState("");

    const invitePlayer = useInviteNewPlayer();
    const apiError = (invitePlayer.error as Error | null)?.message ?? "";

    // Resolve the display name of the active club
    const activeClub = clubs.find((c) => c.id === clubId) ?? null;
    const clubName = activeClub?.name ?? null;

    const handleFormChange = useCallback((patch: Partial<RegisterPlayerFormState>): void => {
        setForm((prev) => {
            if (patch.fullName !== undefined) setFullNameError("");
            if (patch.email !== undefined) setEmailError("");
            return { ...prev, ...patch };
        });
    }, []);

    const validate = (): boolean => {
        let valid = true;
        if (!form.fullName.trim()) {
            setFullNameError("Full name is required.");
            valid = false;
        }
        if (!form.email.trim()) {
            setEmailError("Email address is required.");
            valid = false;
        } else if (!EMAIL_RE.test(form.email.trim())) {
            setEmailError("Enter a valid email address.");
            valid = false;
        }
        return valid;
    };

    const handleSubmit = useCallback(
        (e: FormEvent): void => {
            e.preventDefault();
            if (!validate()) return;

            invitePlayer.mutate(
                {
                    full_name: form.fullName.trim(),
                    email: form.email.trim(),
                    club_id: clubId ?? "",
                },
                {
                    onSuccess: () => {
                        void navigate({
                            to: "/players",
                            search: { registered: true },
                        });
                    },
                }
            );
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [form, clubId, invitePlayer, navigate]
    );

    const handleCancel = useCallback((): void => {
        void navigate({ to: "/players", search: { registered: undefined } });
    }, [navigate]);

    const handleDismissError = useCallback((): void => {
        invitePlayer.reset();
    }, [invitePlayer]);

    return (
        <RegisterPlayerView
            form={form}
            clubName={clubName}
            fullNameError={fullNameError}
            emailError={emailError}
            apiError={apiError}
            isPending={invitePlayer.isPending}
            onFormChange={handleFormChange}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            onDismissError={handleDismissError}
        />
    );
}
