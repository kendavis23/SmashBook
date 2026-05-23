import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import InvoicesContainer from "./InvoicesContainer";

const mockRefetch = vi.fn();

vi.mock("../../hooks", () => ({
    useListInvoices: vi.fn(),
}));

vi.mock("@repo/ui", () => ({
    Breadcrumb: ({ items }: { items: { label: string }[] }) => (
        <nav>
            {items.map((i) => (
                <span key={i.label}>{i.label}</span>
            ))}
        </nav>
    ),
    formatUTCDate: (iso: string) => iso.split("T")[0] ?? iso,
}));

import { useListInvoices } from "../../hooks";
const mockUseListInvoices = useListInvoices as ReturnType<typeof vi.fn>;

const mockInvoices = [
    {
        id: "inv_1",
        number: "INV-001",
        status: "paid",
        amount_due: 9900,
        amount_paid: 9900,
        currency: "gbp",
        created: "2026-05-01T00:00:00Z",
        period_start: "2026-05-01T00:00:00Z",
        period_end: "2026-06-01T00:00:00Z",
        hosted_invoice_url: "https://stripe.com/invoice/1",
        invoice_pdf: "https://stripe.com/invoice/1.pdf",
    },
];

beforeEach(() => {
    vi.clearAllMocks();
    mockRefetch.mockReset();
});

describe("InvoicesContainer — loading state", () => {
    it("renders loading indicator", () => {
        mockUseListInvoices.mockReturnValue({
            data: [],
            isLoading: true,
            error: null,
            refetch: mockRefetch,
        });
        render(<InvoicesContainer />);
        expect(screen.getByText("Loading invoices…")).toBeInTheDocument();
    });
});

describe("InvoicesContainer — error state", () => {
    it("renders error message", () => {
        mockUseListInvoices.mockReturnValue({
            data: [],
            isLoading: false,
            error: new Error("Gateway error"),
            refetch: mockRefetch,
        });
        render(<InvoicesContainer />);
        expect(screen.getByText("Gateway error")).toBeInTheDocument();
    });
});

describe("InvoicesContainer — success state", () => {
    it("renders invoice number", () => {
        mockUseListInvoices.mockReturnValue({
            data: mockInvoices,
            isLoading: false,
            error: null,
            refetch: mockRefetch,
        });
        render(<InvoicesContainer />);
        expect(screen.getByText("INV-001")).toBeInTheDocument();
    });
});

describe("InvoicesContainer — refresh", () => {
    it("calls refetch when Refresh is clicked", () => {
        mockUseListInvoices.mockReturnValue({
            data: mockInvoices,
            isLoading: false,
            error: null,
            refetch: mockRefetch,
        });
        render(<InvoicesContainer />);
        fireEvent.click(screen.getByRole("button", { name: "Refresh invoices" }));
        expect(mockRefetch).toHaveBeenCalled();
    });
});
