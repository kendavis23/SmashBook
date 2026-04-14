import { useCreateCourt, useUpdateCourt } from "../hooks";
import type { Court, CourtInput, SurfaceType } from "../types";
import { AlertToast } from "@repo/ui";
import { X } from "lucide-react";
import type { FormEvent, JSX } from "react";
import { useState } from "react";
import { createPortal } from "react-dom";

const fieldCls =
    "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground " +
    "placeholder:text-muted-foreground transition focus:border-cta focus:outline-none focus:ring-2 focus:ring-cta-ring/30";

const SURFACE_OPTIONS: { value: SurfaceType; label: string }[] = [
    { value: "indoor", label: "Indoor" },
    { value: "outdoor", label: "Outdoor" },
    { value: "crystal", label: "Crystal" },
    { value: "artificial_grass", label: "Artificial Grass" },
];

type Props = {
    clubId: string;
    onClose: () => void;
    onSuccess?: (message: string) => void;
    initialData?: Court;
};

export default function CourtModal({
    clubId,
    onClose,
    onSuccess,
    initialData,
}: Props): JSX.Element {
    const isEdit = !!initialData;
    const [name, setName] = useState(initialData?.name ?? "");
    const [surfaceType, setSurfaceType] = useState<SurfaceType>(
        initialData?.surface_type ?? "artificial_grass"
    );
    const [hasLighting, setHasLighting] = useState(initialData?.has_lighting ?? false);
    const [lightingSurcharge, setLightingSurcharge] = useState(
        initialData?.lighting_surcharge != null ? String(initialData.lighting_surcharge) : ""
    );
    const [isActive, setIsActive] = useState(initialData?.is_active ?? true);
    const [nameError, setNameError] = useState("");

    const createCourt = useCreateCourt(clubId);
    const updateCourt = useUpdateCourt(clubId, initialData?.id ?? "");

    const active = isEdit ? updateCourt : createCourt;
    const isPending = active.isPending;
    const apiError = (active.error as Error | null)?.message ?? "";

    const handleSubmit = (e: FormEvent): void => {
        e.preventDefault();
        if (!name.trim()) {
            setNameError("Court name is required.");
            return;
        }
        setNameError("");

        const surcharge = lightingSurcharge.trim() ? Number(lightingSurcharge) : null;

        if (isEdit) {
            updateCourt.mutate(
                {
                    name: name.trim(),
                    surface_type: surfaceType,
                    has_lighting: hasLighting,
                    lighting_surcharge: surcharge,
                    is_active: isActive,
                },
                {
                    onSuccess: () => {
                        onClose();
                        onSuccess?.("Court updated successfully.");
                    },
                }
            );
        } else {
            const payload: CourtInput = {
                club_id: clubId,
                name: name.trim(),
                surface_type: surfaceType,
                has_lighting: hasLighting,
                lighting_surcharge: surcharge,
            };
            createCourt.mutate(payload, {
                onSuccess: () => {
                    onClose();
                    onSuccess?.("Court created successfully.");
                },
            });
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="w-full max-w-md rounded-xl border border-border bg-card shadow-xl">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-border px-6 py-4">
                    <h2 className="mt-0.5 text-base font-semibold text-foreground">
                        {isEdit ? "Edit court" : "Create a court"}
                    </h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={handleSubmit} noValidate>
                    <div className="space-y-4 px-6 py-5">
                        {apiError ? (
                            <AlertToast
                                title={apiError}
                                variant="error"
                                onClose={() => active.reset()}
                            />
                        ) : null}

                        {/* Name */}
                        <div>
                            <label
                                htmlFor="court-name"
                                className="mb-1 block text-sm font-medium text-foreground"
                            >
                                Court Name <span className="text-destructive">*</span>
                            </label>
                            <input
                                id="court-name"
                                type="text"
                                className={`${fieldCls} ${nameError ? "border-destructive focus:border-destructive focus:ring-destructive/20" : ""}`}
                                placeholder="e.g. Court 1"
                                value={name}
                                onChange={(e) => {
                                    setName(e.target.value);
                                    if (nameError) setNameError("");
                                }}
                            />
                            {nameError ? (
                                <p className="mt-1 text-xs text-destructive">{nameError}</p>
                            ) : null}
                        </div>

                        {/* Surface Type */}
                        <div>
                            <label
                                htmlFor="court-surface"
                                className="mb-1 block text-sm font-medium text-foreground"
                            >
                                Surface Type
                            </label>
                            <select
                                id="court-surface"
                                className={fieldCls}
                                value={surfaceType}
                                onChange={(e) => setSurfaceType(e.target.value as SurfaceType)}
                            >
                                {SURFACE_OPTIONS.map((opt) => (
                                    <option key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Lighting */}
                        <div className="flex items-center gap-3">
                            <input
                                id="court-lighting"
                                type="checkbox"
                                className="h-4 w-4 rounded border-border accent-cta"
                                checked={hasLighting}
                                onChange={(e) => setHasLighting(e.target.checked)}
                            />
                            <label
                                htmlFor="court-lighting"
                                className="text-sm font-medium text-foreground"
                            >
                                Has Lighting
                            </label>
                        </div>

                        {/* Active Status — edit mode only */}
                        {isEdit ? (
                            <div className="flex items-center gap-3">
                                <input
                                    id="court-active"
                                    type="checkbox"
                                    className="h-4 w-4 rounded border-border accent-cta"
                                    checked={isActive}
                                    onChange={(e) => setIsActive(e.target.checked)}
                                />
                                <label
                                    htmlFor="court-active"
                                    className="text-sm font-medium text-foreground"
                                >
                                    Active
                                </label>
                            </div>
                        ) : null}

                        {/* Lighting Surcharge */}
                        {hasLighting ? (
                            <div>
                                <label
                                    htmlFor="court-surcharge"
                                    className="mb-1 block text-sm font-medium text-foreground"
                                >
                                    Lighting Surcharge
                                </label>
                                <input
                                    id="court-surcharge"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    className={fieldCls}
                                    placeholder="e.g. 5.00"
                                    value={lightingSurcharge}
                                    onChange={(e) => setLightingSurcharge(e.target.value)}
                                />
                            </div>
                        ) : null}
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-end gap-3 border-t border-border px-6 py-4">
                        <button type="button" onClick={onClose} className="btn-outline">
                            Cancel
                        </button>
                        <button type="submit" disabled={isPending} className="btn-cta">
                            {isPending
                                ? isEdit
                                    ? "Updating..."
                                    : "Creating..."
                                : isEdit
                                  ? "Update Court"
                                  : "Create Court"}
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
}
