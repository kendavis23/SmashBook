"""
Aggregator router for the Analytics domain.

New analytics endpoint files (reports, dashboards, exports, etc.) should declare
their own ``router = APIRouter(prefix="/<feature>", tags=["analytics-<feature>"])``
and register it here. The top-level v1 router then includes this aggregator once.

Example, once endpoints exist:

    from .reports import router as reports_router
    from .exports import router as exports_router

    analytics_router.include_router(reports_router)
    analytics_router.include_router(exports_router)
"""

from fastapi import APIRouter

from .players import router as players_router
from .revenue import router as revenue_router
from .utilisation import router as utilisation_router

analytics_router = APIRouter(prefix="/analytics")
analytics_router.include_router(utilisation_router)
analytics_router.include_router(revenue_router)
analytics_router.include_router(players_router)
