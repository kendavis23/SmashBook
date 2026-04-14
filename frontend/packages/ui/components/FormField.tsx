import type { JSX, ReactNode } from "react";

export function FormField({
    label,
    children,
    className,
    labelClassName,
}: {
    label: string;
    children: ReactNode;
    className?: string;
    labelClassName?: string;
}): JSX.Element {
    return (
        <div className={className}>
            <label className={labelClassName}>{label}</label>
            {children}
        </div>
    );
}
