import uuid
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
