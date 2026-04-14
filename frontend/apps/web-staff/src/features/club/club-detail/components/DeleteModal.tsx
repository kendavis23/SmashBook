import type { JSX } from "react";
import { ConfirmDeleteModal } from "@repo/ui";

export function DeleteModal({
    onConfirm,
    onCancel,
    saving,
}: {
    onConfirm: () => void;
    onCancel: () => void;
    saving: boolean;
}): JSX.Element {
    return (
        <ConfirmDeleteModal
            title="Delete rule"
            description="Are you sure you want to delete this rule? This action cannot be undone."
            onConfirm={onConfirm}
            onCancel={onCancel}
            saving={saving}
        />
    );
}
