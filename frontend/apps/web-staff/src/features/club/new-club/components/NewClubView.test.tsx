import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import NewClubView from "./NewClubView";

vi.mock("@repo/ui", () => ({
    AlertToast: ({ title, onClose }: { title: string; onClose: () => void }) => (
        <div role="alert">
            {title}
            <button onClick={onClose}>Dismiss</button>
        </div>
    ),
    Breadcrumb: ({ items }: { items: { label: string }[] }) => (
        <nav>
            {items.map((i) => (
                <span key={i.label}>{i.label}</span>
            ))}
        </nav>
    ),
    SelectInput: ({
        name,
        value,
        onValueChange,
        options,
    }: {
        name?: string;
        value: string;
        onValueChange: (v: string) => void;
        options: Array<{ value: string; label: string }>;
    }) => (
        <select
            name={name}
            id={name}
            aria-label="Currency"
            value={value}
            onChange={(e) => onValueChange(e.target.value)}
        >
            {options.map((o) => (
                <option key={o.value} value={o.value}>
                    {o.label}
                </option>
            ))}
        </select>
    ),
}));

const defaultProps = {
    form: { name: "", address: "", currency: "GBP" },
    nameError: "",
    apiError: "",
    isPending: false,
    onFormChange: vi.fn(),
    onSubmit: vi.fn(),
    onCancel: vi.fn(),
    onDismissError: vi.fn(),
};

describe("NewClubView — rendering", () => {
    it("renders the heading and form fields", () => {
        render(<NewClubView {...defaultProps} />);
        expect(screen.getByRole("heading", { name: "New Club" })).toBeInTheDocument();
        expect(screen.getByLabelText(/Club Name/)).toBeInTheDocument();
        expect(screen.getByLabelText("Address")).toBeInTheDocument();
        expect(screen.getByLabelText("Currency")).toBeInTheDocument();
    });

    it("renders breadcrumb items", () => {
        render(<NewClubView {...defaultProps} />);
        expect(screen.getByText("Clubs")).toBeInTheDocument();
    });
});

describe("NewClubView — validation", () => {
    it("shows name error when nameError is provided", () => {
        render(<NewClubView {...defaultProps} nameError="Club name is required." />);
        expect(screen.getByText("Club name is required.")).toBeInTheDocument();
    });

    it("marks name input as invalid when nameError is set", () => {
        render(<NewClubView {...defaultProps} nameError="Club name is required." />);
        expect(screen.getByLabelText(/Club Name/)).toHaveAttribute("aria-invalid", "true");
    });
});

describe("NewClubView — api error", () => {
    it("shows alert toast for api error", () => {
        render(<NewClubView {...defaultProps} apiError="Something went wrong." />);
        expect(screen.getByRole("alert")).toBeInTheDocument();
        expect(screen.getByText("Something went wrong.")).toBeInTheDocument();
    });

    it("calls onDismissError when alert is dismissed", () => {
        const onDismissError = vi.fn();
        render(<NewClubView {...defaultProps} apiError="Error" onDismissError={onDismissError} />);
        fireEvent.click(screen.getByText("Dismiss"));
        expect(onDismissError).toHaveBeenCalled();
    });
});

describe("NewClubView — interactions", () => {
    it("calls onFormChange when name input changes", () => {
        const onFormChange = vi.fn();
        render(<NewClubView {...defaultProps} onFormChange={onFormChange} />);
        fireEvent.change(screen.getByLabelText(/Club Name/), {
            target: { value: "New Club" },
        });
        expect(onFormChange).toHaveBeenCalledWith({ name: "New Club" });
    });

    it("calls onFormChange when address textarea changes", () => {
        const onFormChange = vi.fn();
        render(<NewClubView {...defaultProps} onFormChange={onFormChange} />);
        fireEvent.change(screen.getByLabelText("Address"), {
            target: { value: "123 Main St" },
        });
        expect(onFormChange).toHaveBeenCalledWith({ address: "123 Main St" });
    });

    it("calls onFormChange when currency select changes", () => {
        const onFormChange = vi.fn();
        render(<NewClubView {...defaultProps} onFormChange={onFormChange} />);
        fireEvent.change(screen.getByLabelText("Currency"), {
            target: { value: "EUR" },
        });
        expect(onFormChange).toHaveBeenCalledWith({ currency: "EUR" });
    });

    it("calls onCancel when Cancel is clicked", () => {
        const onCancel = vi.fn();
        render(<NewClubView {...defaultProps} onCancel={onCancel} />);
        fireEvent.click(screen.getByText("Cancel"));
        expect(onCancel).toHaveBeenCalled();
    });

    it("calls onSubmit when form is submitted", () => {
        const onSubmit = vi.fn((e) => e.preventDefault());
        render(<NewClubView {...defaultProps} onSubmit={onSubmit} />);
        fireEvent.click(screen.getByText("Create Club"));
        expect(onSubmit).toHaveBeenCalled();
    });
});

describe("NewClubView — pending state", () => {
    it("disables buttons when isPending is true", () => {
        render(<NewClubView {...defaultProps} isPending={true} />);
        expect(screen.getByText("Cancel")).toBeDisabled();
    });

    it("shows loading text when isPending is true", () => {
        render(<NewClubView {...defaultProps} isPending={true} />);
        expect(screen.getByText("Creating…")).toBeInTheDocument();
    });
});
