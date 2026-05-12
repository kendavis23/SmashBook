import enum
from sqlalchemy import Column, String, ForeignKey, Numeric, Text, Boolean, Enum, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from .base import Base, UUIDMixin, TimestampMixin


class WalletTransactionType(str, enum.Enum):
    top_up = "top_up"
    debit = "debit"
    refund = "refund"
    adjustment = "adjustment"


class WalletTransactionSource(str, enum.Enum):
    booking = "booking"
    membership = "membership"
    invoice = "invoice"
    manual = "manual"


class Wallet(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "wallets"

    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, unique=True)
    balance = Column(Numeric(10, 2), nullable=False, default=0.00)
    currency = Column(String(3), nullable=False, default="GBP")
    auto_topup_enabled = Column(Boolean, nullable=False, default=False)
    auto_topup_threshold = Column(Numeric(10, 2), nullable=True)
    auto_topup_amount = Column(Numeric(10, 2), nullable=True)

    user = relationship("User", back_populates="wallet")
    transactions = relationship("WalletTransaction", back_populates="wallet")


class WalletTransaction(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "wallet_transactions"

    wallet_id = Column(UUID(as_uuid=True), ForeignKey("wallets.id"), nullable=False)
    transaction_type = Column(Enum(WalletTransactionType), nullable=False)
    amount = Column(Numeric(10, 2), nullable=False)
    balance_after = Column(Numeric(10, 2), nullable=False)
    reference = Column(String(255), nullable=True)
    notes = Column(Text, nullable=True)
    source_type = Column(Enum(WalletTransactionSource), nullable=True)
    source_id = Column(UUID(as_uuid=True), nullable=True)

    wallet = relationship("Wallet", back_populates="transactions")


class WalletClubDebt(Base, UUIDMixin, TimestampMixin):
    """Records platform's obligation to transfer wallet-debit funds to the club's Stripe account."""
    __tablename__ = "wallet_club_debts"

    club_id = Column(UUID(as_uuid=True), ForeignKey("clubs.id"), nullable=False, index=True)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False)
    wallet_transaction_id = Column(UUID(as_uuid=True), ForeignKey("wallet_transactions.id"), nullable=False, unique=True)
    amount = Column(Numeric(10, 2), nullable=False)
    platform_fee_amount = Column(Numeric(10, 2), nullable=False, default=0)
    stripe_transfer_id = Column(String(255), nullable=True)
    settled_at = Column(DateTime(timezone=True), nullable=True)

    wallet_transaction = relationship("WalletTransaction")
