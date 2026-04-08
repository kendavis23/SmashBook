import { Home } from "lucide-react";
import type { JSX } from "react";

export type BreadcrumbItem = {
    label: string;
    href?: string;
    onClick?: () => void;
};

type BreadcrumbProps = {
    items: BreadcrumbItem[];
    showHomeIcon?: boolean;
};

export function Breadcrumb({ items, showHomeIcon = true }: BreadcrumbProps): JSX.Element {
    const handleHomeClick = () => {
        window.location.href = "/dashboard";
    };

    return (
        <nav className="page-breadcrumb">
            {showHomeIcon && (
                <button
                    onClick={handleHomeClick}
                    className="shrink-0 text-foreground opacity-50 hover:opacity-100 transition-opacity"
                    aria-label="Go to Dashboard"
                >
                    <Home size={13} />
                </button>
            )}

            {items.map((item, index) => {
                const isLast = index === items.length - 1;

                return (
                    <span key={index} className="contents">
                        <span className="shrink-0 text-[11px] font-light opacity-30 text-foreground">
                            /
                        </span>

                        {isLast ? (
                            <span className="shrink-0 font-medium text-foreground">
                                {item.label}
                            </span>
                        ) : item.onClick ? (
                            <button
                                onClick={item.onClick}
                                className="shrink-0 text-muted-foreground transition-colors duration-150 hover:text-foreground"
                            >
                                {item.label}
                            </button>
                        ) : item.href ? (
                            <a
                                href={item.href}
                                className="shrink-0 text-muted-foreground transition-colors duration-150 hover:text-foreground"
                            >
                                {item.label}
                            </a>
                        ) : (
                            <span className="shrink-0 text-muted-foreground">{item.label}</span>
                        )}
                    </span>
                );
            })}
        </nav>
    );
}
