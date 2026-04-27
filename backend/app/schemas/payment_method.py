import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel


class SetupIntentResponse(BaseModel):
    client_secret: str
    setup_intent_id: str


class SavePaymentMethodRequest(BaseModel):
    payment_method_id: str
    set_as_default: bool = True


class PaymentMethodResponse(BaseModel):
    id: str
    brand: str
    last4: str
    exp_month: int
    exp_year: int
    is_default: bool


class PaymentIntentRequest(BaseModel):
    booking_id: uuid.UUID
    payment_method_id: Optional[str] = None


class PaymentIntentResponse(BaseModel):
    client_secret: str
    payment_intent_id: str
    amount: int   # pence
    currency: str


class WalletTransactionResponse(BaseModel):
    id: uuid.UUID
    transaction_type: str
    amount: Decimal
    balance_after: Decimal
    reference: Optional[str]
    notes: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class WalletResponse(BaseModel):
    balance: Decimal
    currency: str
    auto_topup_enabled: bool
    auto_topup_threshold: Optional[Decimal]
    auto_topup_amount: Optional[Decimal]
    transactions: list[WalletTransactionResponse]

    class Config:
        from_attributes = True
