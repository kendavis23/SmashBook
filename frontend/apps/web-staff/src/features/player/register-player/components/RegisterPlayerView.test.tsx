import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import RegisterPlayerView from "./RegisterPlayerView";
import type { RegisterPlayerFormState } from "./RegisterPlayerView";

vi.mock("@repo/ui", () => ({
    Breadcrumb: ({ items }: { items: { label: string }[] }) => (
        <nav>
            {items.map((i) => (
                <span key={i.label}>{i.label}</span>
            ))}
        </nav>
    ),
    AlertToast: ({ title, onClose }: { title: string; onClose: () => void }) => (
        <div role="alert">
            {title}
            <button onClick={onClose}>Dismiss</button>
        </div>
    ),
}));

const baseForm: RegisterPlayerFormState = { fullName: "", email: "" };

const baseProps = {
    form: baseForm,
    clubName: "Ace Padel",
    fullNameError: "",
    emailError: "",
    apiError: "",
    isPending: false,
    onFormChange: vi.fn(),
    onSubmit: vi.fn(),
    onCancel: vi.fn(),
    onDismissError: vi.fn(),
};

describe("RegisterPlayerView — rendering", () => {
    it("renders the Register Player heading", () => {
        render(<RegisterPlayerView {...baseProps} />);
        expect(screen.getByRole("heading", { name: "Register Player" })).toBeInTheDocument();
    });

    it("renders the club name as a read-only field", () => {
        render(<RegisterPlayerView {...baseProps} />);
        expect(screen.getByText("Ace Padel")).toBeInTheDocument();
    });

    it("shows — when clubName is null", () => {
        render(<RegisterPlayerView {...baseProps} clubName={null} />);
        expect(screen.getByText("—")).toBeInTheDocument();
    });

    it("renders the Send Invitation submit button", () => {
        render(<RegisterPlayerView {...baseProps} />);
        expect(screen.getByRole("button", { name: /send invitation/i })).toBeInTheDocument();
    });

    it("shows Sending… and disables the button when isPending", () => {
        render(<RegisterPlayerView {...baseProps} isPending />);
        expect(screen.getByRole("button", { name: /sending/i })).toBeDisabled();
    });
});

describe("RegisterPlayerView — validation errors", () => {
    it("renders full name error", () => {
        render(<RegisterPlayerView {...baseProps} fullNameError="Full name is required." />);
        expect(screen.getByText("Full name is required.")).toBeInTheDocument();
    });

    it("renders email error", () => {
        render(<RegisterPlayerView {...baseProps} emailError="Enter a valid email address." />);
        expect(screen.getByText("Enter a valid email address.")).toBeInTheDocument();
    });
});

describe("RegisterPlayerView — API error", () => {
    it("renders the error alert", () => {
        render(<RegisterPlayerView {...baseProps} apiError="Email already registered" />);
        expect(screen.getByRole("alert")).toBeInTheDocument();
        expect(screen.getByText("Email already registered")).toBeInTheDocument();
    });

    it("calls onDismissError when Dismiss is clicked", () => {
        const onDismissError = vi.fn();
        render(
            <RegisterPlayerView {...baseProps} apiError="Oops" onDismissError={onDismissError} />
        );
        fireEvent.click(screen.getByText("Dismiss"));
        expect(onDismissError).toHaveBeenCalled();
    });
});

describe("RegisterPlayerView — interactions", () => {
    it("calls onFormChange with fullName patch when full name input changes", () => {
        const onFormChange = vi.fn();
        render(<RegisterPlayerView {...baseProps} onFormChange={onFormChange} />);
        fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: "Jane Doe" } });
        expect(onFormChange).toHaveBeenCalledWith({ fullName: "Jane Doe" });
    });

    it("calls onFormChange with email patch when email input changes", () => {
        const onFormChange = vi.fn();
        render(<RegisterPlayerView {...baseProps} onFormChange={onFormChange} />);
        fireEvent.change(screen.getByLabelText(/email address/i), {
            target: { value: "jane@example.com" },
        });
        expect(onFormChange).toHaveBeenCalledWith({ email: "jane@example.com" });
    });

    it("calls onCancel when Cancel is clicked", () => {
        const onCancel = vi.fn();
        render(<RegisterPlayerView {...baseProps} onCancel={onCancel} />);
        fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
        expect(onCancel).toHaveBeenCalled();
    });

    it("calls onSubmit when the form is submitted", () => {
        const onSubmit = vi.fn((e) => e.preventDefault());
        render(<RegisterPlayerView {...baseProps} onSubmit={onSubmit} />);
        fireEvent.submit(screen.getByRole("button", { name: /send invitation/i }).closest("form")!);
        expect(onSubmit).toHaveBeenCalled();
    });
});
