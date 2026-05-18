import type { JSX } from "react";
import { CreditCard } from "lucide-react";
import { PaymentCardsView } from "./PaymentCardsView";

export default function PaymentCardsContainer(): JSX.Element {
    return (
        <div className="w-full space-y-5">
            <section className="card-surface overflow-hidden">
                <header className="border-b border-border bg-muted/10 px-5 py-4 sm:px-6">
                    <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary text-secondary-foreground shadow-xs">
                            <CreditCard size={16} />
                        </div>
                        <div>
                            <h1 className="text-lg font-semibold tracking-tight text-foreground">
                                Payment Cards
                            </h1>
                            <p className="mt-0.5 text-sm text-muted-foreground">
                                Manage your saved cards for bookings
                            </p>
                        </div>
                    </div>
                </header>
                <div className="px-5 py-6 sm:px-6">
                    <PaymentCardsView />
                </div>
            </section>
        </div>
    );
}
