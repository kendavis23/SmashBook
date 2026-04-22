import type { JSX } from "react";
import { createPortal } from "react-dom";
import ManageBookingModalContainer from "./ManageBookingModalContainer";

type Props = {
    bookingId: string;
    onClose: () => void;
    onSuccess?: () => void;
};

export function ManageBookingModal({ bookingId, onClose, onSuccess }: Props): JSX.Element {
    return createPortal(
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-2xl">
                <ManageBookingModalContainer
                    bookingId={bookingId}
                    onClose={onClose}
                    onSuccess={onSuccess}
                />
            </div>
        </div>,
        document.body
    );
}
