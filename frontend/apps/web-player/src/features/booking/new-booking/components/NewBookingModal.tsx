import type { JSX } from "react";
import { createPortal } from "react-dom";
import NewBookingModalContainer from "./NewBookingModalContainer";

type Props = {
    courtId: string;
    courtName: string;
    date: string;
    startTime: string;
    onClose: () => void;
    onSuccess?: (courtName: string) => void;
};

export function NewBookingModal({
    courtId,
    courtName,
    date,
    startTime,
    onClose,
    onSuccess,
}: Props): JSX.Element {
    return createPortal(
        <div
            className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-black/50 p-4 backdrop-blur-sm"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div
                className="flex w-full max-w-2xl flex-col rounded-2xl border border-border bg-card shadow-2xl"
                style={{ height: "min(90vh, 90dvh)", maxHeight: "100%" }}
            >
                <NewBookingModalContainer
                    courtId={courtId}
                    courtName={courtName}
                    date={date}
                    startTime={startTime}
                    onClose={onClose}
                    onSuccess={onSuccess ? () => onSuccess(courtName) : undefined}
                />
            </div>
        </div>,
        document.body
    );
}
