import { useState, useCallback } from "react";
import type { FormEvent, JSX } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useCreateCourt } from "../../hooks";
import { useClubAccess } from "../../store";
import type { SurfaceType } from "../../types";
import NewCourtView from "./NewCourtView";
import type { NewCourtFormState } from "./NewCourtView";

function createDefaultForm(): NewCourtFormState {
    return {
        name: "",
        surfaceType: "artificial_grass" as SurfaceType,
        hasLighting: false,
        lightingSurcharge: "",
    };
}

export default function NewCourtContainer(): JSX.Element {
    const navigate = useNavigate();
    const { clubId } = useClubAccess();
    const [form, setForm] = useState<NewCourtFormState>(createDefaultForm);
    const [nameError, setNameError] = useState("");

    const createCourt = useCreateCourt(clubId ?? "");
    const apiError = (createCourt.error as Error | null)?.message ?? "";

    const handleFormChange = useCallback((patch: Partial<NewCourtFormState>): void => {
        setForm((prev) => {
            const next = { ...prev, ...patch };
            if (patch.name !== undefined) setNameError("");
            return next;
        });
    }, []);

    const validate = (): boolean => {
        if (!form.name.trim()) {
            setNameError("Court name is required.");
            return false;
        }
        return true;
    };

    const handleSubmit = useCallback(
        (e: FormEvent): void => {
            e.preventDefault();
            if (!validate()) return;

            const surcharge = form.lightingSurcharge.trim() ? Number(form.lightingSurcharge) : null;

            createCourt.mutate(
                {
                    club_id: clubId ?? "",
                    name: form.name.trim(),
                    surface_type: form.surfaceType,
                    has_lighting: form.hasLighting,
                    lighting_surcharge: surcharge,
                },
                {
                    onSuccess: () => {
                        void navigate({
                            to: "/courts",
                            search: { created: true, updated: undefined },
                        });
                    },
                }
            );
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [form, clubId, createCourt, navigate]
    );

    const handleCancel = useCallback((): void => {
        void navigate({ to: "/courts", search: { created: undefined, updated: undefined } });
    }, [navigate]);

    const handleDismissError = useCallback((): void => {
        createCourt.reset();
    }, [createCourt]);

    return (
        <NewCourtView
            form={form}
            nameError={nameError}
            apiError={apiError}
            isPending={createCourt.isPending}
            onFormChange={handleFormChange}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            onDismissError={handleDismissError}
        />
    );
}
