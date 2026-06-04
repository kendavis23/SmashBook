from fastapi import APIRouter
from .endpoints import admin, auth, players, courts, bookings, payments, clubs, memberships, staff, trainers, support, equipment, calendar_reservations, subscription, webhooks
from app.ai.api.router import ai_router
from app.analytics.api.router import analytics_router

api_router = APIRouter()
api_router.include_router(admin.router)
api_router.include_router(auth.router)
api_router.include_router(players.router)
api_router.include_router(courts.router)
api_router.include_router(bookings.router)
api_router.include_router(payments.router)
api_router.include_router(clubs.router)
api_router.include_router(memberships.router)
api_router.include_router(staff.router)
api_router.include_router(trainers.router)
api_router.include_router(support.router)
api_router.include_router(equipment.router)
api_router.include_router(calendar_reservations.router)
api_router.include_router(subscription.router)
api_router.include_router(webhooks.router)

# Domain aggregators — endpoints register against these inside their respective subtrees,
# so adding a new AI or analytics endpoint does not require editing this file.
api_router.include_router(ai_router)
api_router.include_router(analytics_router)
