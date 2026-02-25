import enum
from sqlalchemy import Column, String, ForeignKey, Numeric, Text, Enum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from .base import Base, UUIDMixin, TimestampMixin


class WalletTransactionType(str, enum.Enum):
    top_up = "top_up"
    debit = "debit"
    refund = "refund"
    adjustment = "adjustment"


class Wallet(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "wallets"

    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, unique=True)
    balance = Column(Numeric(10, 2), nullable=False, default=0.00)
    currency = Column(String(3), nullable=False, default="GBP")

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

    wallet = relationship("Wallet", back_populates="transactions")
