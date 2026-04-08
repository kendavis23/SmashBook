import type { JSX } from "react";
import { createPortal } from "react-dom";

export function DeleteModal({
    onConfirm,
    onCancel,
    saving,
}: {
    onConfirm: () => void;
    onCancel: () => void;
    saving: boolean;
}): JSX.Element {
    return createPortal(
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            onClick={(e) => {
                if (e.target === e.currentTarget) onCancel();
            }}
        >
            <div className="w-full max-w-sm rounded-xl border border-border bg-card px-6 pb-6 pt-5 shadow-xl">
                <h4 className="mb-2 text-base font-semibold text-foreground">Delete rule</h4>
                <p className="text-sm text-muted-foreground">
                    Are you sure you want to delete this rule? This action cannot be undone.
                </p>
                <div className="mt-5 flex items-center justify-end gap-3">
                    <button type="button" onClick={onCancel} className="btn-outline">
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        className="btn-destructive"
                        disabled={saving}
                    >
                        {saving ? "Deleting..." : "Yes, delete"}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
