import type { JSX } from "react";
import { createPortal } from "react-dom";

export interface ConfirmDeleteModalProps {
    title: string;
    description: string;
    onConfirm: () => void;
    onCancel: () => void;
    saving: boolean;
}

export function ConfirmDeleteModal({
    title,
    description,
    onConfirm,
    onCancel,
    saving,
}: ConfirmDeleteModalProps): JSX.Element {
    return createPortal(
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
            onClick={(e) => {
                if (e.target === e.currentTarget) onCancel();
            }}
        >
            <div className="w-full max-w-sm rounded-2xl border border-border bg-card shadow-2xl">
                {/* Header strip */}
                <div className="flex items-center gap-3 rounded-t-2xl bg-destructive/10 px-6 py-4">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-destructive/15">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="h-4 w-4 text-destructive"
                            aria-hidden="true"
                        >
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6l-1 14H6L5 6" />
                            <path d="M10 11v6" />
                            <path d="M14 11v6" />
                            <path d="M9 6V4h6v2" />
                        </svg>
                    </span>
                    <h4 className="text-sm font-semibold text-destructive">{title}</h4>
                </div>

                {/* Body */}
                <div className="px-6 py-5">
                    <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-2 border-t border-border px-6 py-4">
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={saving}
                        className="inline-flex items-center justify-center rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-foreground shadow-sm transition-all duration-150 hover:bg-accent active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 disabled:pointer-events-none disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={saving}
                        className="inline-flex items-center justify-center rounded-md bg-destructive px-4 py-2 text-sm font-medium text-white shadow-sm transition-all duration-150 hover:bg-destructive/90 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/50 disabled:pointer-events-none disabled:opacity-50"
                    >
                        {saving ? "Deleting…" : "Yes, delete"}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
