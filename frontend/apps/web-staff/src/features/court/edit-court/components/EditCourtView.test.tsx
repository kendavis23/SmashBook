import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import EditCourtView from "./EditCourtView";
import type { EditCourtFormState } from "./EditCourtView";

vi.mock("@repo/ui", () => ({
    Breadcrumb: ({ items }: { items: { label: string }[] }) => (
        <nav>
            {items.map((item) => (
                <span key={item.label}>{item.label}</span>
            ))}
        </nav>
    ),
    AlertToast: ({ title, onClose }: { title: string; onClose: () => void }) => (
        <div role="alert">
            <span>{title}</span>
            <button onClick={onClose}>Dismiss</button>
        </div>
    ),
    NumberInput: ({
        className,
        ...props
    }: React.InputHTMLAttributes<HTMLInputElement> & { className?: string }) => (
        <input type="number" className={className} {...props} />
    ),
    SelectInput: ({
        value,
        onValueChange,
        options,
        placeholder,
    }: {
        value: string;
        onValueChange: (v: string) => void;
        options: { value: string; label: string }[];
        placeholder?: string;
    }) => (
        <select
            value={value}
            onChange={(e) => onValueChange(e.target.value)}
            aria-label={placeholder ?? "select"}
        >
            {options.map((option) => (
                <option key={option.value} value={option.value}>
                    {option.label}
                </option>
            ))}
        </select>
    ),
}));

const defaultForm: EditCourtFormState = {
    name: "Court 1",
    surfaceType: "artificial_grass",
    hasLighting: true,
    lightingSurcharge: "5",
    isActive: true,
};

const defaultProps = {
    courtName: "Court 1",
    form: defaultForm,
    nameError: "",
    apiError: "",
    isPending: false,
    onFormChange: vi.fn(),
    onSubmit: vi.fn((event: React.FormEvent) => event.preventDefault()),
    onCancel: vi.fn(),
    onDismissError: vi.fn(),
};

describe("EditCourtView", () => {
    it("renders heading and status section", () => {
        render(<EditCourtView {...defaultProps} />);

        expect(screen.getByRole("heading", { name: "Edit Court" })).toBeInTheDocument();
        expect(screen.getByText("Status")).toBeInTheDocument();
        expect(screen.getByLabelText(/active/i)).toBeChecked();
    });

    it("calls onFormChange when editing fields", () => {
        const onFormChange = vi.fn();
        render(<EditCourtView {...defaultProps} onFormChange={onFormChange} />);

        fireEvent.change(screen.getByLabelText(/court name/i), { target: { value: "Court 2" } });
        fireEvent.click(screen.getByLabelText(/^active$/i));

        expect(onFormChange).toHaveBeenCalledWith({ name: "Court 2" });
        expect(onFormChange).toHaveBeenCalledWith({ isActive: false });
    });

    it("shows api error and dismisses it", () => {
        const onDismissError = vi.fn();
        render(
            <EditCourtView
                {...defaultProps}
                apiError="Update failed"
                onDismissError={onDismissError}
            />
        );

        expect(screen.getByRole("alert")).toHaveTextContent("Update failed");
        fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
        expect(onDismissError).toHaveBeenCalled();
    });

    it("handles cancel and submit actions", () => {
        const onCancel = vi.fn();
        const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault());
        render(<EditCourtView {...defaultProps} onCancel={onCancel} onSubmit={onSubmit} />);

        fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
        fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

        expect(onCancel).toHaveBeenCalled();
        expect(onSubmit).toHaveBeenCalled();
    });

    it("disables submit while pending", () => {
        render(<EditCourtView {...defaultProps} isPending={true} />);

        expect(screen.getByRole("button", { name: /saving/i })).toBeDisabled();
    });
});
