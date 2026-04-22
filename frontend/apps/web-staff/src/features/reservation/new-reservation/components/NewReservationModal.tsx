import type { JSX } from "react";
import { createPortal } from "react-dom";
import NewReservationModalContainer from "./NewReservationModalContainer";

type Props = {
    onClose: () => void;
    onSuccess?: () => void;
    date?: string;
};

export function NewReservationModal({ onClose, onSuccess, date }: Props): JSX.Element {
    return createPortal(
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-2xl">
                <NewReservationModalContainer onClose={onClose} onSuccess={onSuccess} date={date} />
            </div>
        </div>,
        document.body
    );
}
