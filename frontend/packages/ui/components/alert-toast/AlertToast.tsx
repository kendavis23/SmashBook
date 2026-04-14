import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import { useEffect, useRef, useState, type JSX } from "react";
import { createPortal } from "react-dom";

export type AlertToastVariant = "success" | "error" | "info";

export interface AlertToastProps {
    title: string;
    description?: string;
    variant?: AlertToastVariant;
    duration?: number;
    onClose?: () => void;
}

const variantStyles: Record<AlertToastVariant, string> = {
    success: "bg-success text-success-foreground border border-success",
    error: "bg-destructive text-destructive-foreground border border-destructive",
    info: "bg-primary text-primary-foreground border border-primary",
};

const variantIcons: Record<AlertToastVariant, JSX.Element> = {
    success: <CheckCircle2 className="w-5 h-5" />,
    error: <AlertCircle className="w-5 h-5" />,
    info: <Info className="w-5 h-5" />,
};

function useToastContainer(): HTMLElement | null {
    const containerRef = useRef<HTMLElement | null>(null);
    const [, forceUpdate] = useState(0);

    useEffect(() => {
        let el = document.getElementById("alert-toast-root");
        if (!el) {
            el = document.createElement("div");
            el.id = "alert-toast-root";
            document.body.appendChild(el);
        }
        containerRef.current = el;
        forceUpdate((n) => n + 1);

        return () => {
            if (el && el.childNodes.length === 0) {
                el.remove();
            }
        };
    }, []);

    return containerRef.current;
}

export function AlertToast({
    title,
    description,
    variant = "info",
    duration = 10000,
    onClose,
}: AlertToastProps): JSX.Element | null {
    const container = useToastContainer();

    useEffect(() => {
        const timer = setTimeout(() => {
            onClose?.();
        }, duration);
        return () => clearTimeout(timer);
    }, [duration, onClose]);

    if (!container) return null;

    return createPortal(
        <div
            role="alert"
            aria-live="assertive"
            className={`fixed top-4 right-4 z-[9999] w-full max-w-sm 
            rounded-xl border shadow-lg backdrop-blur-md 
            flex flex-col overflow-hidden
            animate-in fade-in slide-in-from-top-2 
            ${variantStyles[variant]}`}
        >
            {/* Content */}
            <div className="flex items-start gap-3 px-4 py-3">
                <span className="mt-0.5 opacity-90">{variantIcons[variant]}</span>

                <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold leading-tight">{title}</p>
                    {description && (
                        <p className="text-xs mt-1 opacity-80 leading-snug">{description}</p>
                    )}
                </div>

                <button
                    onClick={onClose}
                    aria-label="Close"
                    className="opacity-60 hover:opacity-100 transition-all"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>

            {/* Progress bar */}
            <div className="h-[2px] w-full bg-white/20">
                <div
                    className="h-full bg-current"
                    style={{
                        animation: `toast-progress linear forwards`,
                        animationDuration: `${duration}ms`,
                    }}
                />
            </div>

            {/* Keyframes */}
            <style>
                {`
                @keyframes toast-progress {
                    from { width: 100%; }
                    to { width: 0%; }
                }
            `}
            </style>
        </div>,
        container
    );
}
