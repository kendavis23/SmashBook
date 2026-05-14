import type { JSX } from "react";
import { CheckCircle2, CreditCard, Wallet } from "lucide-react";
import { formatCurrency } from "@repo/ui";

interface Props {
    amount: number;
    currency: string;
    method: "card" | "wallet";
    onClose: () => void;
}

export function PaymentSuccessStep({ amount, currency, method, onClose }: Props): JSX.Element {
    const isWallet = method === "wallet";

    return (
        <div className="flex flex-1 flex-col items-center justify-center px-6 pb-6 pt-8 text-center">
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-success/10 ring-8 ring-success/5">
                <CheckCircle2 size={44} className="text-success" />
            </div>
            <div className="mt-8 max-w-sm space-y-2">
                <p className="text-2xl font-semibold tracking-tight text-foreground">
                    Payment successful
                </p>
                <p className="text-base text-muted-foreground">
                    {formatCurrency(amount)} has been deducted from your{" "}
                    {isWallet ? "wallet" : "card"}.
                </p>
            </div>

            <div className="mt-8 flex w-full max-w-sm items-center justify-between rounded-xl border border-border/70 bg-muted/25 px-4 py-3 text-left">
                <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-card text-cta shadow-sm">
                        {isWallet ? <Wallet size={18} /> : <CreditCard size={18} />}
                    </span>
                    <div>
                        <p className="text-sm font-semibold text-foreground">Total paid</p>
                        <p className="text-xs uppercase text-muted-foreground">{currency}</p>
                    </div>
                </div>
                <p className="text-lg font-semibold text-foreground">{formatCurrency(amount)}</p>
            </div>

            <button type="button" onClick={onClose} className="btn-cta mt-auto min-h-11 w-full">
                Done
            </button>
        </div>
    );
}
