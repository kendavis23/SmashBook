import type { JSX } from "react";
import { createPortal } from "react-dom";
import ManageReservationModalContainer from "./ManageReservationModalContainer";

type Props = {
    reservationId: string;
    onClose: () => void;
    onSuccess?: () => void;
};

export function ManageReservationModal({ reservationId, onClose, onSuccess }: Props): JSX.Element {
    return createPortal(
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            {/*
              IMPORTANT: flex flex-col + NO overflow-y-auto + NO padding here.
              Overflow and padding live inside ManageReservationModalView.
              style={{ height: "90vh" }} keeps the shell fixed so sticky header/footer always show.
            */}
            <div
                className="flex w-full max-w-2xl flex-col rounded-2xl border border-border bg-card shadow-2xl"
                style={{ height: "90vh" }}
            >
                <ManageReservationModalContainer
                    reservationId={reservationId}
                    onClose={onClose}
                    onSuccess={onSuccess}
                />
            </div>
        </div>,
        document.body
    );
}
