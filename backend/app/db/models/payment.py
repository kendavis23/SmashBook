import enum
from sqlalchemy import Column, String, Integer, ForeignKey, Numeric, Text, Boolean, Enum, DateTime
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


class Payment(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "payments"

    booking_id = Column(UUID(as_uuid=True), ForeignKey("bookings.id"), nullable=False)
    club_id = Column(UUID(as_uuid=True), ForeignKey("clubs.id"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    stripe_payment_intent_id = Column(String(255), nullable=True)
    stripe_charge_id = Column(String(255), nullable=True)
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
