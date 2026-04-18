import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import NewCourtView from "./NewCourtView";
import type { NewCourtFormState } from "./NewCourtView";

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

const defaultForm: NewCourtFormState = {
    name: "Court 1",
    surfaceType: "artificial_grass",
    hasLighting: false,
    lightingSurcharge: "",
};

const defaultProps = {
    form: defaultForm,
    nameError: "",
    apiError: "",
    isPending: false,
    onFormChange: vi.fn(),
    onSubmit: vi.fn((event: React.FormEvent) => event.preventDefault()),
    onCancel: vi.fn(),
    onDismissError: vi.fn(),
};

describe("NewCourtView", () => {
    it("renders heading and form sections", () => {
        render(<NewCourtView {...defaultProps} />);

        expect(screen.getByRole("heading", { name: "New Court" })).toBeInTheDocument();
        expect(screen.getByText("Court Details")).toBeInTheDocument();
    });

    it("calls onFormChange for text and checkbox fields", () => {
        const onFormChange = vi.fn();
        render(<NewCourtView {...defaultProps} onFormChange={onFormChange} />);

        fireEvent.change(screen.getByLabelText(/court name/i), { target: { value: "Court 2" } });
        fireEvent.click(screen.getByLabelText(/has lighting/i));

        expect(onFormChange).toHaveBeenCalledWith({ name: "Court 2" });
        expect(onFormChange).toHaveBeenCalledWith({ hasLighting: true });
    });

    it("renders surcharge field when lighting is enabled", () => {
        render(<NewCourtView {...defaultProps} form={{ ...defaultForm, hasLighting: true }} />);

        expect(screen.getByLabelText(/lighting surcharge/i)).toBeInTheDocument();
    });

    it("shows api error and dismisses it", () => {
        const onDismissError = vi.fn();
        render(
            <NewCourtView
                {...defaultProps}
                apiError="Create failed"
                onDismissError={onDismissError}
            />
        );

        expect(screen.getByRole("alert")).toHaveTextContent("Create failed");
        fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
        expect(onDismissError).toHaveBeenCalled();
    });

    it("handles cancel and submit actions", () => {
        const onCancel = vi.fn();
        const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault());
        render(<NewCourtView {...defaultProps} onCancel={onCancel} onSubmit={onSubmit} />);

        fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
        fireEvent.click(screen.getByRole("button", { name: "Create Court" }));

        expect(onCancel).toHaveBeenCalled();
        expect(onSubmit).toHaveBeenCalled();
    });

    it("disables submit while pending", () => {
        render(<NewCourtView {...defaultProps} isPending={true} />);

        expect(screen.getByRole("button", { name: /creating/i })).toBeDisabled();
    });
});
