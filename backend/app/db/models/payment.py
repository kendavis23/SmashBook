import enum
from sqlalchemy import Column, String, Integer, ForeignKey, Numeric, Text, Boolean, Enum, DateTime, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from .base import Base, UUIDMixin, TimestampMixin


class PaymentMethod(str, enum.Enum):
    stripe_card = "stripe_card"
    wallet = "wallet"
    cash = "cash"
    account_credit = "account_credit"


class PaymentState(str, enum.Enum):
    pending = "pending"
    succeeded = "succeeded"
    failed = "failed"
    refunded = "refunded"
    partially_refunded = "partially_refunded"


class DisputeStatus(str, enum.Enum):
    open = "open"
    under_review = "under_review"
    won = "won"
    lost = "lost"


class PlatformFeeType(str, enum.Enum):
    booking_fee = "booking_fee"
    revenue_share = "revenue_share"
    third_party_share = "third_party_share"


class PayoutStatus(str, enum.Enum):
    pending = "pending"
    in_transit = "in_transit"
    paid = "paid"
    failed = "failed"
    canceled = "canceled"


class PayoutReconStatus(str, enum.Enum):
    unmatched = "unmatched"
    matched = "matched"
    partial = "partial"
    discrepancy = "discrepancy"


class Payment(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "payments"

    booking_id = Column(UUID(as_uuid=True), ForeignKey("bookings.id"), nullable=False)
    club_id = Column(UUID(as_uuid=True), ForeignKey("clubs.id"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    stripe_payment_intent_id = Column(String(255), nullable=True)
    stripe_charge_id = Column(String(255), nullable=True)
    stripe_destination_payment_id = Column(String(255), nullable=True, index=True)
    amount = Column(Numeric(10, 2), nullable=False)
    currency = Column(String(3), nullable=False, default="GBP")
    payment_method = Column(Enum(PaymentMethod), nullable=False)
    state = Column(Enum(PaymentState), nullable=False, default=PaymentState.pending)
    refund_amount = Column(Numeric(10, 2), nullable=True)
    notes = Column(Text, nullable=True)

    # Invoice fields (merged from invoices table)
    stripe_invoice_id = Column(String(255), nullable=True)
    stripe_receipt_url = Column(String(500), nullable=True)
    pdf_storage_path = Column(String(500), nullable=True)  # GCS path
    stripe_payout_id = Column(String(255), nullable=True, index=True)

    # G4: payment reliability and fraud detection
    failure_reason = Column(Text, nullable=True)
    retry_count = Column(Integer, nullable=False, default=0)
    next_retry_at = Column(DateTime(timezone=True), nullable=True)
    anomaly_flagged = Column(Boolean, nullable=False, default=False)
    anomaly_reason = Column(Text, nullable=True)
    dispute_status = Column(Enum(DisputeStatus), nullable=True)

    booking = relationship("Booking", back_populates="payments")
    platform_fees = relationship("PlatformFee", back_populates="payment")


class PlatformFee(Base, UUIDMixin):
    __tablename__ = "platform_fees"

    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False)
    payment_id = Column(UUID(as_uuid=True), ForeignKey("payments.id"), nullable=False)
    fee_type = Column(Enum(PlatformFeeType), nullable=False)
    amount = Column(Numeric(10, 2), nullable=False)
    pct_applied = Column(Numeric(5, 2), nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False)

    payment = relationship("Payment", back_populates="platform_fees")


class Payout(Base, UUIDMixin, TimestampMixin):
    """
    One Stripe payout (a single bank deposit) to a club's Connect account.

    Bundles many ``payments`` minus refunds minus Stripe fees:
    ``gross_amount - fee_amount = amount`` (net deposited), and
    ``matched_amount`` (sum of linked payments, net of refunds) is reconciled
    against it. Linked to payments via the ``stripe_payout_id`` string — not an
    FK — so the connected-account ``py_xxx`` match in ``handle_payout_paid``
    stamps payments independently of this row.
    """
    __tablename__ = "payouts"

    __table_args__ = (
        Index("ix_payouts_club_recon", "club_id", "reconciliation_status"),
        Index("ix_payouts_arrival", "arrival_date"),
    )

    club_id = Column(UUID(as_uuid=True), ForeignKey("clubs.id"), nullable=False)
    stripe_payout_id = Column(String(255), nullable=False, unique=True)
    stripe_connect_account_id = Column(String(255), nullable=True)
    gross_amount = Column(Numeric(10, 2), nullable=True)
    fee_amount = Column(Numeric(10, 2), nullable=True)
    amount = Column(Numeric(10, 2), nullable=False)
    currency = Column(String(3), nullable=False, default="GBP")
    status = Column(Enum(PayoutStatus), nullable=False, default=PayoutStatus.pending)
    arrival_date = Column(DateTime(timezone=True), nullable=True)
    statement_descriptor = Column(String(255), nullable=True)
    failure_code = Column(String(255), nullable=True)
    failure_message = Column(Text, nullable=True)
    reconciliation_status = Column(
        Enum(PayoutReconStatus), nullable=False, default=PayoutReconStatus.unmatched
    )
    matched_amount = Column(Numeric(10, 2), nullable=True)
    discrepancy_amount = Column(Numeric(10, 2), nullable=True)
    paid_at = Column(DateTime(timezone=True), nullable=True)
