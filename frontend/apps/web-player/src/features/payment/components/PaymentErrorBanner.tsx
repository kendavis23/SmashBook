import type { JSX } from "react";
import { AlertCircle } from "lucide-react";

interface Props {
    message: string;
    onDismiss?: () => void;
}

export function PaymentErrorBanner({ message, onDismiss }: Props): JSX.Element {
    return (
        <div className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3">
            <AlertCircle size={16} className="mt-0.5 shrink-0 text-destructive" />
            <p className="flex-1 text-sm text-destructive">{message}</p>
            {onDismiss ? (
                <button
                    type="button"
                    onClick={onDismiss}
                    className="text-xs text-destructive underline underline-offset-2 hover:no-underline"
                >
                    Dismiss
                </button>
            ) : null}
        </div>
    );
}
