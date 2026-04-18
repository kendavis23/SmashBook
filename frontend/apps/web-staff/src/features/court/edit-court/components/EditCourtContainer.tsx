import { useState, useCallback, useEffect } from "react";
import type { FormEvent, JSX } from "react";
import { useNavigate, useParams } from "@tanstack/react-router";
import { useListCourts, useUpdateCourt } from "../../hooks";
import { useClubAccess } from "../../store";
import type { SurfaceType } from "../../types";
import EditCourtView from "./EditCourtView";
import type { EditCourtFormState } from "./EditCourtView";

function createEmptyForm(): EditCourtFormState {
    return {
        name: "",
        surfaceType: "artificial_grass" as SurfaceType,
        hasLighting: false,
        lightingSurcharge: "",
        isActive: true,
    };
}

export default function EditCourtContainer(): JSX.Element {
    const navigate = useNavigate();
    const { courtId } = useParams({ strict: false }) as { courtId: string };
    const { clubId } = useClubAccess();

    const { data: courts = [], isLoading } = useListCourts(clubId ?? "");
    const court = courts.find((c) => c.id === courtId);

    const [form, setForm] = useState<EditCourtFormState>(createEmptyForm);
    const [initialised, setInitialised] = useState(false);
    const [nameError, setNameError] = useState("");

    useEffect(() => {
        if (court && !initialised) {
            setForm({
                name: court.name ?? "",
                surfaceType: court.surface_type as SurfaceType,
                hasLighting: court.has_lighting ?? false,
                lightingSurcharge:
                    court.lighting_surcharge != null ? String(court.lighting_surcharge) : "",
                isActive: court.is_active ?? true,
            });
            setInitialised(true);
        }
    }, [court, initialised]);

    const updateCourt = useUpdateCourt(clubId ?? "", courtId);
    const apiError = (updateCourt.error as Error | null)?.message ?? "";

    const handleFormChange = useCallback((patch: Partial<EditCourtFormState>): void => {
        setForm((prev) => {
            if (patch.name !== undefined) setNameError("");
            return { ...prev, ...patch };
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

            updateCourt.mutate(
                {
                    name: form.name.trim(),
                    surface_type: form.surfaceType,
                    has_lighting: form.hasLighting,
                    lighting_surcharge: surcharge,
                    is_active: form.isActive,
                },
                {
                    onSuccess: () => {
                        void navigate({
                            to: "/courts",
                            search: { created: undefined, updated: true },
                        });
                    },
                }
            );
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [form, updateCourt, navigate]
    );

    const handleCancel = useCallback((): void => {
        void navigate({ to: "/courts", search: { created: undefined, updated: undefined } });
    }, [navigate]);

    const handleDismissError = useCallback((): void => {
        updateCourt.reset();
    }, [updateCourt]);

    if (isLoading || !initialised) {
        return (
            <div className="flex items-center justify-center gap-3 py-32">
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-cta" />
                <span className="text-sm text-muted-foreground">Loading court…</span>
            </div>
        );
    }

    return (
        <EditCourtView
            courtName={form.name}
            form={form}
            nameError={nameError}
            apiError={apiError}
            isPending={updateCourt.isPending}
            onFormChange={handleFormChange}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            onDismissError={handleDismissError}
        />
    );
}
