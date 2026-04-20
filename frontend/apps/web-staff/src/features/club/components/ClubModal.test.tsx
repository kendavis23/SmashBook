import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ClubModal from "./ClubModal";

const mockCreateMutate = vi.hoisted(() => vi.fn());
const mockCreateReset = vi.hoisted(() => vi.fn());
const mockUpdateMutate = vi.hoisted(() => vi.fn());
const mockUpdateReset = vi.hoisted(() => vi.fn());

vi.mock("../hooks", () => ({
    useCreateClub: () => ({
        mutate: mockCreateMutate,
        isPending: false,
        error: null,
        reset: mockCreateReset,
    }),
    useUpdateClub: () => ({
        mutate: mockUpdateMutate,
        isPending: false,
        error: null,
        reset: mockUpdateReset,
    }),
}));

vi.mock("@repo/ui", () => ({
    AlertToast: ({ title, onClose }: { title: string; onClose: () => void }) => (
        <div role="alert">
            <span>{title}</span>
            <button onClick={onClose}>Dismiss</button>
        </div>
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

describe("ClubModal", () => {
    beforeEach(() => {
        mockCreateMutate.mockReset();
        mockCreateReset.mockReset();
        mockUpdateMutate.mockReset();
        mockUpdateReset.mockReset();
    });

    it("renders create mode and validates required name", () => {
        render(<ClubModal onClose={vi.fn()} />);

        expect(screen.getByText("Create a club")).toBeInTheDocument();
        fireEvent.click(screen.getByRole("button", { name: "Create Club" }));

        expect(screen.getByText("Club name is required.")).toBeInTheDocument();
        expect(mockCreateMutate).not.toHaveBeenCalled();
    });

    it("submits a trimmed create payload and fires success callback", () => {
        const onClose = vi.fn();
        const onSuccess = vi.fn();
        mockCreateMutate.mockImplementation((payload, options) => {
            options.onSuccess();
        });

        render(<ClubModal onClose={onClose} onSuccess={onSuccess} />);

        fireEvent.change(screen.getByLabelText(/club name/i), {
            target: { value: "  Padel Madrid  " },
        });
        fireEvent.change(screen.getByLabelText(/address/i), {
            target: { value: "  Main Street  " },
        });
        fireEvent.click(screen.getByRole("button", { name: "Create Club" }));

        expect(mockCreateMutate).toHaveBeenCalledWith(
            {
                name: "Padel Madrid",
                address: "Main Street",
                currency: "GBP",
            },
            expect.objectContaining({ onSuccess: expect.any(Function) })
        );
        expect(onClose).toHaveBeenCalled();
        expect(onSuccess).toHaveBeenCalledWith("Club created successfully.");
    });

    it("renders edit mode, pre-fills values, and updates the club", () => {
        const onClose = vi.fn();
        const onSuccess = vi.fn();
        const initialData = {
            id: "club-1",
            name: "Old Club",
            address: "1 Street",
            currency: "GBP",
        };
        mockUpdateMutate.mockImplementation((payload, options) => {
            options.onSuccess();
        });

        render(
            <ClubModal onClose={onClose} onSuccess={onSuccess} initialData={initialData as never} />
        );

        expect(screen.getByText("Update club details")).toBeInTheDocument();
        expect(screen.getByDisplayValue("Old Club")).toBeInTheDocument();
        fireEvent.change(screen.getByLabelText(/club name/i), {
            target: { value: " New Club " },
        });
        fireEvent.click(screen.getByRole("button", { name: "Update Club" }));

        expect(mockUpdateMutate).toHaveBeenCalledWith(
            {
                name: "New Club",
                address: "1 Street",
                currency: "GBP",
            },
            expect.objectContaining({ onSuccess: expect.any(Function) })
        );
        expect(onClose).toHaveBeenCalled();
        expect(onSuccess).toHaveBeenCalledWith("Club updated successfully.");
    });

    it("closes when Cancel is clicked", () => {
        const onClose = vi.fn();
        render(<ClubModal onClose={onClose} />);

        fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

        expect(onClose).toHaveBeenCalled();
    });
});
