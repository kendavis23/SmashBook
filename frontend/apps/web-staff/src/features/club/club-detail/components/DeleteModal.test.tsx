import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DeleteModal } from "./DeleteModal";

describe("DeleteModal", () => {
    it("renders confirmation message", () => {
        render(<DeleteModal onConfirm={vi.fn()} onCancel={vi.fn()} saving={false} />);
        expect(screen.getByText(/Are you sure/)).toBeInTheDocument();
    });

    it("calls onConfirm when Yes, delete is clicked", () => {
        const handleConfirm = vi.fn();
        render(<DeleteModal onConfirm={handleConfirm} onCancel={vi.fn()} saving={false} />);
        fireEvent.click(screen.getByText("Yes, delete"));
        expect(handleConfirm).toHaveBeenCalled();
    });

    it("calls onCancel when Cancel is clicked", () => {
        const handleCancel = vi.fn();
        render(<DeleteModal onConfirm={vi.fn()} onCancel={handleCancel} saving={false} />);
        fireEvent.click(screen.getByText("Cancel"));
        expect(handleCancel).toHaveBeenCalled();
    });

    it("shows Deleting… when saving is true", () => {
        render(<DeleteModal onConfirm={vi.fn()} onCancel={vi.fn()} saving={true} />);
        expect(screen.getByText("Deleting…")).toBeInTheDocument();
    });

    it("delete button is disabled when saving", () => {
        render(<DeleteModal onConfirm={vi.fn()} onCancel={vi.fn()} saving={true} />);
        expect(screen.getByText("Deleting…")).toBeDisabled();
    });

    it("calls onCancel when backdrop is clicked", () => {
        const handleCancel = vi.fn();
        render(<DeleteModal onConfirm={vi.fn()} onCancel={handleCancel} saving={false} />);
        const backdrop = document.querySelector(".fixed.inset-0");
        fireEvent.click(backdrop as Element);
        expect(handleCancel).toHaveBeenCalled();
    });
});
