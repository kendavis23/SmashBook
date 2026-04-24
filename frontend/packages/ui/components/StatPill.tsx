import type { JSX } from "react";

export type StatPillProps = {
    label: string;
    value: string;
    type?: "default" | "datetime";
};

export function StatPill({ label, value, type = "default" }: StatPillProps): JSX.Element {
    const renderValue = () => {
        if (type === "datetime") {
            const commaIndex = value.lastIndexOf(",");
            if (commaIndex !== -1) {
                const date = value.slice(0, commaIndex);
                const time = value.slice(commaIndex + 1).trim();
                return (
                    <>
                        <span className="block">{date}</span>
                        <span className="block whitespace-nowrap">{time}</span>
                    </>
                );
            }
        }
        return value;
    };

    return (
        <div className="rounded-lg bg-muted/50 px-3 py-2.5">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                {label}
            </p>
            <p className="mt-1 text-sm font-medium text-foreground">{renderValue()}</p>
        </div>
    );
}
