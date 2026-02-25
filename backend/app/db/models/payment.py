import enum
from sqlalchemy import Column, String, ForeignKey, Numeric, Text, Enum
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


class Payment(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "payments"

    booking_id = Column(UUID(as_uuid=True), ForeignKey("bookings.id"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    stripe_payment_intent_id = Column(String(255), nullable=True)
    stripe_charge_id = Column(String(255), nullable=True)
    amount = Column(Numeric(10, 2), nullable=False)
    currency = Column(String(3), nullable=False, default="GBP")
    payment_method = Column(Enum(PaymentMethod), nullable=False)
    state = Column(Enum(PaymentState), nullable=False, default=PaymentState.pending)
    refund_amount = Column(Numeric(10, 2), nullable=True)
    notes = Column(Text, nullable=True)

    booking = relationship("Booking", back_populates="payments")


class Invoice(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "invoices"

    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    booking_id = Column(UUID(as_uuid=True), ForeignKey("bookings.id"), nullable=True)
    stripe_invoice_id = Column(String(255), nullable=True)
    stripe_receipt_url = Column(String(500), nullable=True)
    amount = Column(Numeric(10, 2), nullable=False)
    currency = Column(String(3), nullable=False, default="GBP")
    pdf_storage_path = Column(String(500), nullable=True)  # GCS path

    booking = relationship("Booking", back_populates=None)
