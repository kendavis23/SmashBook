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
        <div className="flex gap-6">
            {/* Sidebar nav */}
            <nav className="w-32 shrink-0 space-y-1" aria-label="Billing sections">
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
