import { useState, useCallback } from "react";
import type { FormEvent, JSX } from "react";
import { useAuth } from "@repo/auth";
import { useRegisterPlayer } from "../../hooks";
import { useClubAccess, canRegisterPlayer } from "../../store";
import PlayersView from "./PlayersView";
import { RegisterPlayerModal } from "./RegisterPlayerModal";
import type { RegisterPlayerFormState } from "./RegisterPlayerModal";

function createDefaultForm(): RegisterPlayerFormState {
    return { full_name: "", email: "", password: "" };
}

export default function PlayersContainer(): JSX.Element {
    const { tenantSubdomain } = useAuth();
    const { clubId, role } = useClubAccess();
    const canRegister = canRegisterPlayer(role);

    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState<RegisterPlayerFormState>(createDefaultForm);
    const [fullNameError, setFullNameError] = useState("");
    const [emailError, setEmailError] = useState("");
    const [passwordError, setPasswordError] = useState("");
    const [successMsg, setSuccessMsg] = useState("");

    const registerPlayer = useRegisterPlayer();

    const handleRegisterClick = useCallback((): void => {
        setForm(createDefaultForm());
        setFullNameError("");
        setEmailError("");
        setPasswordError("");
        registerPlayer.reset();
        setShowModal(true);
    }, [registerPlayer]);

    const handleClose = useCallback((): void => {
        setShowModal(false);
    }, []);

    const validate = useCallback((): boolean => {
        let valid = true;

        if (!form.full_name.trim()) {
            setFullNameError("Full name is required.");
            valid = false;
        } else {
            setFullNameError("");
        }

        if (!form.email.trim()) {
            setEmailError("Email is required.");
            valid = false;
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
            setEmailError("Enter a valid email address.");
            valid = false;
        } else {
            setEmailError("");
        }

        if (!form.password) {
            setPasswordError("Password is required.");
            valid = false;
        } else if (form.password.length < 8) {
            setPasswordError("Password must be at least 8 characters.");
            valid = false;
        } else {
            setPasswordError("");
        }

        return valid;
    }, [form]);

    const handleSubmit = useCallback(
        (e: FormEvent): void => {
            e.preventDefault();
            if (!validate()) return;

            registerPlayer.mutate(
                {
                    tenant_subdomain: tenantSubdomain ?? "",
                    full_name: form.full_name.trim(),
                    email: form.email.trim(),
                    password: form.password,
                },
                {
                    onSuccess: () => {
                        setShowModal(false);
                        setSuccessMsg(`Player "${form.full_name.trim()}" registered successfully.`);
                    },
                }
            );
        },
        [form, tenantSubdomain, registerPlayer, validate]
    );

    return (
        <>
            <PlayersView
                clubId={clubId}
                canRegister={canRegister}
                onRegisterClick={handleRegisterClick}
                registerSuccessMsg={successMsg}
                onDismissSuccess={() => setSuccessMsg("")}
            />
            {showModal ? (
                <RegisterPlayerModal
                    form={form}
                    isPending={registerPlayer.isPending}
                    apiError={(registerPlayer.error as Error | null)?.message ?? ""}
                    fullNameError={fullNameError}
                    emailError={emailError}
                    passwordError={passwordError}
                    onFormChange={(patch) => setForm((prev) => ({ ...prev, ...patch }))}
                    onSubmit={handleSubmit}
                    onClose={handleClose}
                    onDismissError={() => registerPlayer.reset()}
                />
            ) : null}
        </>
    );
}
