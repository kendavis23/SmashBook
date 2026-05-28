import { useEffect, type JSX } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import type { MembershipPlan } from "@repo/player-domain/models";
import type { PlanIntent } from "./MembershipPlansContainer";
import { SelectCardStep } from "./SelectCardStep";

type Props = {
    plan: MembershipPlan;
    planIntent: PlanIntent;
    onClose: () => void;
    onConfirm: (paymentMethodId: string) => void;
    isLoading: boolean;
    error: string | null;
};

export function PlanChangeModal({
    plan,
    planIntent,
    onClose,
    onConfirm,
    isLoading,
    error,
}: Props): JSX.Element {
    // Lock body scroll while open
    useEffect(() => {
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = prev;
        };
    }, []);

    // Close on Escape
    useEffect(() => {
        function handleKey(e: KeyboardEvent) {
            if (e.key === "Escape" && !isLoading) onClose();
        }
        document.addEventListener("keydown", handleKey);
        return () => document.removeEventListener("keydown", handleKey);
    }, [isLoading, onClose]);

    return createPortal(
        <div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center sm:p-4"
            onClick={(e) => {
                if (e.target === e.currentTarget && !isLoading) onClose();
            }}
        >
            {/* Sheet on mobile, centered card on sm+ */}
            <div className="relative flex w-full flex-col rounded-t-2xl border border-border bg-card shadow-2xl sm:max-w-lg sm:rounded-2xl">
                {/* Modal header */}
                <div className="flex items-center justify-between border-b border-border px-5 py-4">
                    <div>
                        <h2 className="text-base font-semibold text-foreground">
                            {planIntent === "upgrade"
                                ? "Upgrade your plan"
                                : planIntent === "downgrade"
                                  ? "Downgrade your plan"
                                  : "Subscribe to plan"}
                        </h2>
                        <p className="mt-0.5 text-xs text-muted-foreground">{plan.name}</p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isLoading}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
                        aria-label="Close"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Modal body — reuse SelectCardStep without its BackButton */}
                <div className="overflow-y-auto px-5 py-5" style={{ maxHeight: "80dvh" }}>
                    <SelectCardStep
                        plan={plan}
                        planIntent={planIntent}
                        onBack={onClose}
                        hideBackButton
                        onConfirm={onConfirm}
                        isLoading={isLoading}
                        error={error}
                    />
                </div>
            </div>
        </div>,
        document.body
    );
}
