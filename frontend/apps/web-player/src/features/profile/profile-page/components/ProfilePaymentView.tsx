import { type JSX, useState } from "react";
import { CreditCard, Wallet } from "lucide-react";
import { PaymentCardsView } from "./PaymentCardsView";
import { PaymentWalletView } from "./PaymentWalletView";

type BillingTab = "cards" | "wallet";

const TABS: { id: BillingTab; label: string; icon: JSX.Element }[] = [
    { id: "cards", label: "Cards", icon: <CreditCard size={13} /> },
    { id: "wallet", label: "Wallet", icon: <Wallet size={13} /> },
];

export function ProfilePaymentView(): JSX.Element {
    const [activeTab, setActiveTab] = useState<BillingTab>("cards");

    return (
        <div className="flex flex-col gap-4 sm:flex-row sm:gap-6">
            {/* Mobile: horizontal tab strip / Desktop: sidebar nav */}
            {/* Mobile: horizontal tab strip */}
            <nav className="flex shrink-0 flex-row gap-1 sm:hidden" aria-label="Billing sections">
                {TABS.map(({ id, label, icon }) => (
                    <button
                        key={id}
                        type="button"
                        onClick={() => setActiveTab(id)}
                        className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                            activeTab === id
                                ? "bg-cta/10 text-cta"
                                : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                        }`}
                    >
                        {icon}
                        {label}
                    </button>
                ))}
            </nav>

            {/* Desktop: fixed-width sidebar */}
            <nav className="hidden w-32 shrink-0 space-y-1 sm:block" aria-label="Billing sections">
                {TABS.map(({ id, label, icon }) => (
                    <button
                        key={id}
                        type="button"
                        onClick={() => setActiveTab(id)}
                        className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                            activeTab === id
                                ? "bg-cta/10 text-cta"
                                : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                        }`}
                    >
                        {icon}
                        {label}
                    </button>
                ))}
            </nav>

            {/* Content */}
            <div className="min-w-0 flex-1">
                {activeTab === "cards" ? <PaymentCardsView /> : <PaymentWalletView />}
            </div>
        </div>
    );
}
