import uuid

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.dependencies.auth import require_staff
from app.api.v1.dependencies.tenant import get_tenant
from app.db.models.tenant import Tenant
from app.db.models.user import User
from app.db.session import get_db, get_read_db
from app.schemas.equipment import (
    EquipmentCreateRequest,
    EquipmentInventoryItem,
    EquipmentUpdateRequest,
)
from app.services.equipment_service import EquipmentService

router = APIRouter(prefix="/equipment", tags=["equipment"])


@router.get("", response_model=list[EquipmentInventoryItem])
async def list_equipment(
    club_id: uuid.UUID = Query(...),
    tenant: Tenant = Depends(get_tenant),
    db: AsyncSession = Depends(get_read_db),
):
    """
    List equipment inventory for a club.
    No auth required — tenant-scoped only.
    Returns all items including quantity_total, quantity_available, rental_price, and condition.
    """
    svc = EquipmentService(db)
    return await svc.get_inventory(club_id=club_id, tenant_id=tenant.id)


@router.post("", response_model=EquipmentInventoryItem, status_code=status.HTTP_201_CREATED)
async def create_equipment(
    body: EquipmentCreateRequest,
    club_id: uuid.UUID = Query(...),
    current_user: User = Depends(require_staff),
    tenant: Tenant = Depends(get_tenant),
    db: AsyncSession = Depends(get_db),
):
    """
    Staff only: add a new equipment item to the club's inventory.
    quantity_available is set equal to quantity_total on creation.
    """
    svc = EquipmentService(db)
    return await svc.create_item(
        club_id=club_id,
        tenant_id=tenant.id,
        item_type=body.item_type,
        name=body.name,
        quantity_total=body.quantity_total,
        rental_price=body.rental_price,
        condition=body.condition,
        notes=body.notes,
    )


@router.patch("/{item_id}", response_model=EquipmentInventoryItem)
async def update_equipment(
    item_id: uuid.UUID,
    body: EquipmentUpdateRequest,
    club_id: uuid.UUID = Query(...),
    current_user: User = Depends(require_staff),
    tenant: Tenant = Depends(get_tenant),
    db: AsyncSession = Depends(get_db),
):
    """
    Staff only: update an equipment item.
    Increasing quantity_total restocks quantity_available by the same delta (new stock arrived).
    Decreasing quantity_total is only allowed if sufficient units are currently available
    (i.e. not out on active rentals).
    """
    svc = EquipmentService(db)
    return await svc.update_item(
        item_id=item_id,
        club_id=club_id,
        tenant_id=tenant.id,
        name=body.name,
        rental_price=body.rental_price,
        condition=body.condition,
        notes=body.notes,
        quantity_total=body.quantity_total,
    )


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def retire_equipment(
    item_id: uuid.UUID,
    club_id: uuid.UUID = Query(...),
    current_user: User = Depends(require_staff),
    tenant: Tenant = Depends(get_tenant),
    db: AsyncSession = Depends(get_db),
):
    """
    Staff only: retire an equipment item (soft delete — sets condition to 'retired',
    quantity_available to 0). Blocked if any units are currently out on active rentals.
    Historical rental records are preserved.
    """
    svc = EquipmentService(db)
    await svc.retire_item(item_id=item_id, club_id=club_id, tenant_id=tenant.id)
