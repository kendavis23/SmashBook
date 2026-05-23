"""
Aggregator router for the AI domain.

New AI endpoint files (pricing, gap_detection, matchmaking, churn, chatbot, etc.)
should declare their own ``router = APIRouter(prefix="/<feature>", tags=["ai-<feature>"])``
and register it here. The top-level v1 router then includes this aggregator once,
so adding a new AI endpoint never touches ``app/api/v1/router.py``.

Example, once endpoints exist:

    from .pricing import router as pricing_router
    from .gap_detection import router as gap_detection_router

    ai_router.include_router(pricing_router)
    ai_router.include_router(gap_detection_router)
"""

from fastapi import APIRouter

ai_router = APIRouter(prefix="/ai")
