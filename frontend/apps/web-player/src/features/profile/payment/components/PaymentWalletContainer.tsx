import type { JSX } from "react";
import { Wallet } from "lucide-react";
import { PaymentWalletView } from "./PaymentWalletView";

export default function PaymentWalletContainer(): JSX.Element {
    return (
        <div className="w-full space-y-5">
            <section className="card-surface overflow-hidden">
                <header className="border-b border-border bg-muted/10 px-5 py-4 sm:px-6">
                    <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary text-secondary-foreground shadow-xs">
                            <Wallet size={16} />
                        </div>
                        <div>
                            <h1 className="text-lg font-semibold tracking-tight text-foreground">
                                Wallet
                            </h1>
                            <p className="mt-0.5 text-sm text-muted-foreground">
                                Manage your wallet balance and top-ups
                            </p>
                        </div>
                    </div>
                </header>
                <div className="px-5 py-6 sm:px-6">
                    <PaymentWalletView />
                </div>
            </section>
        </div>
    );
}
