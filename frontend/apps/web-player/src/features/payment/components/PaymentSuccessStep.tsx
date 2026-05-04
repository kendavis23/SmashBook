import type { JSX } from "react";
import { CheckCircle2 } from "lucide-react";
import { formatCurrency } from "@repo/ui";

interface Props {
    amount: number;
    currency: string;
    onClose: () => void;
}

export function PaymentSuccessStep({ amount, onClose }: Props): JSX.Element {
    return (
        <div className="flex flex-col items-center gap-6 px-6 py-12 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success/20">
                <CheckCircle2 size={32} className="text-success" />
            </div>
            <div className="space-y-1">
                <p className="text-xl font-semibold text-foreground">Payment successful</p>
                <p className="text-sm text-muted-foreground">
                    {formatCurrency(amount)} has been charged to your card.
                </p>
            </div>
            <button type="button" onClick={onClose} className="btn-primary px-8">
                Done
            </button>
        </div>
    );
}
