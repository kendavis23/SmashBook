import { useCreateClub, useUpdateClub } from "../hooks";
import type { Club } from "../types";
import { CURRENCIES } from "../types";
import { AlertToast, SelectInput } from "@repo/ui";
import { X } from "lucide-react";
import type { JSX, FormEvent } from "react";
import { useState } from "react";
import { createPortal } from "react-dom";

const fieldCls =
    "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground " +
    "placeholder:text-muted-foreground transition focus:border-cta focus:outline-none focus:ring-2 focus:ring-cta-ring/30";

type Props = {
    onClose: () => void;
    onSuccess?: (message: string) => void;
    initialData?: Club;
};

export default function ClubModal({ onClose, onSuccess, initialData }: Props): JSX.Element {
    const isEdit = !!initialData;
    const [name, setName] = useState(initialData?.name ?? "");
    const [address, setAddress] = useState(initialData?.address ?? "");
    const [currency, setCurrency] = useState(initialData?.currency ?? "GBP");
    const [nameError, setNameError] = useState("");

    const createClub = useCreateClub();
    const updateClub = useUpdateClub(initialData?.id ?? "");

    const active = isEdit ? updateClub : createClub;
    const isPending = active.isPending;
    const apiError = (active.error as Error | null)?.message ?? "";

    const handleSubmit = (e: FormEvent): void => {
        e.preventDefault();
        if (!name.trim()) {
            setNameError("Club name is required.");
            return;
        }
        setNameError("");

        const payload = {
            name: name.trim(),
            address: address.trim() || undefined,
            currency: currency || "GBP",
        };

        if (isEdit) {
            updateClub.mutate(payload, {
                onSuccess: () => {
                    onClose();
                    onSuccess?.("Club updated successfully.");
                },
            });
        } else {
            createClub.mutate(payload, {
                onSuccess: () => {
                    onClose();
                    onSuccess?.("Club created successfully.");
                },
            });
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="w-full max-w-md rounded-xl border border-border bg-card shadow-xl">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-border px-6 py-4">
                    <div>
                        <h2 className="mt-0.5 text-base font-semibold text-foreground">
                            {isEdit ? "Update club details" : "Create a club"}
                        </h2>
                    </div>
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
                                htmlFor="club-name"
                                className="mb-1 block text-sm font-medium text-foreground"
                            >
                                Club Name <span className="text-destructive">*</span>
                            </label>
                            <input
                                id="club-name"
                                type="text"
                                className={`${fieldCls} ${nameError ? "border-destructive focus:border-destructive focus:ring-destructive/20" : ""}`}
                                placeholder="e.g. Padel Club Madrid"
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

                        {/* Address */}
                        <div>
                            <label
                                htmlFor="club-address"
                                className="mb-1 block text-sm font-medium text-foreground"
                            >
                                Address
                            </label>
                            <input
                                id="club-address"
                                type="text"
                                className={fieldCls}
                                placeholder="e.g. 123 Main Street, Madrid"
                                value={address}
                                onChange={(e) => setAddress(e.target.value)}
                            />
                        </div>

                        {/* Currency */}
                        <div>
                            <label
                                htmlFor="club-currency"
                                className="mb-1 block text-sm font-medium text-foreground"
                            >
                                Currency
                            </label>
                            <SelectInput
                                name="club-currency"
                                value={currency}
                                onValueChange={(v) => setCurrency(v)}
                                options={CURRENCIES.map(({ code, label }) => ({
                                    value: code,
                                    label,
                                }))}
                            />
                        </div>
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
                                  ? "Update Club"
                                  : "Create Club"}
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
}
