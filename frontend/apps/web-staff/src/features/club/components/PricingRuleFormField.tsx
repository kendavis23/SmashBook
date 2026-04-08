import type { JSX, ReactNode } from "react";
import { labelCls } from "./pricingRulesConstants";

export function FormField({
    label,
    children,
}: {
    label: string;
    children: ReactNode;
}): JSX.Element {
    return (
        <div>
            <p className={labelCls}>{label}</p>
            {children}
        </div>
    );
}
