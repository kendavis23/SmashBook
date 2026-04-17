import { useCreateClub } from "../../hooks";
import { useNavigate } from "@tanstack/react-router";
import type { FormEvent, JSX } from "react";
import { useCallback, useState } from "react";
import NewClubView, { type NewClubFormState } from "./NewClubView";

const defaultForm: NewClubFormState = { name: "", address: "", currency: "GBP" };

export default function NewClubContainer(): JSX.Element {
    const navigate = useNavigate();
    const [form, setForm] = useState<NewClubFormState>(defaultForm);
    const [nameError, setNameError] = useState("");
    const createClub = useCreateClub();

    const handleSubmit = useCallback(
        (e: FormEvent) => {
            e.preventDefault();
            if (!form.name.trim()) {
                setNameError("Club name is required.");
                return;
            }
            setNameError("");
            createClub.mutate(
                {
                    name: form.name.trim(),
                    address: form.address.trim() || undefined,
                    currency: form.currency.trim().toUpperCase() || "GBP",
                },
                {
                    onSuccess: () =>
                        void navigate({
                            to: "/clubs",
                            search: { created: true, updated: undefined },
                        }),
                }
            );
        },
        [form, createClub, navigate]
    );

    const handleCancel = useCallback(
        () =>
            void navigate({
                to: "/clubs",
                search: { created: undefined, updated: undefined },
            }),
        [navigate]
    );

    return (
        <NewClubView
            form={form}
            nameError={nameError}
            apiError={(createClub.error as Error | null)?.message ?? ""}
            isPending={createClub.isPending}
            onFormChange={(patch) => setForm((prev) => ({ ...prev, ...patch }))}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            onDismissError={() => createClub.reset()}
        />
    );
}
