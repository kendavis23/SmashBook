import type { JSX } from "react";
import { createPortal } from "react-dom";
import InviteStaffModalContainer from "./InviteStaffModalContainer";

type Props = {
    onClose: () => void;
    onSuccess: () => void;
};

export default function InviteStaffModal({ onClose, onSuccess }: Props): JSX.Element {
    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div
                className="flex max-h-[calc(100vh-2rem)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
                role="dialog"
                aria-modal="true"
                aria-labelledby="invite-staff-modal-title"
            >
                <InviteStaffModalContainer onClose={onClose} onSuccess={onSuccess} />
            </div>
        </div>,
        document.body
    );
}
