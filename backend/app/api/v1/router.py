from fastapi import APIRouter
from .endpoints import auth, players, courts, bookings, payments, clubs, staff, trainers, reports, support

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(players.router)
api_router.include_router(courts.router)
api_router.include_router(bookings.router)
api_router.include_router(payments.router)
api_router.include_router(clubs.router)
api_router.include_router(staff.router)
api_router.include_router(trainers.router)
api_router.include_router(reports.router)
api_router.include_router(support.router)
