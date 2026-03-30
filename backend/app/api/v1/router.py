from fastapi import APIRouter
from .endpoints import admin, auth, players, courts, bookings, payments, clubs, memberships, staff, trainers, reports, support, equipment, calendar_reservations

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
api_router.include_router(reports.router)
api_router.include_router(support.router)
api_router.include_router(equipment.router)
api_router.include_router(calendar_reservations.router)
