from fastapi import Depends, HTTPException, Request, status

from app.db.models.tenant import Tenant


def get_tenant(request: Request) -> Tenant:
    """
    Return the tenant resolved by TenantMiddleware.

    Raises 422 if the middleware could not resolve a tenant from the request.
    Endpoints that require a tenant should declare ``Depends(get_tenant)``.
    """
    tenant: Tenant | None = getattr(request.state, "tenant", None)
    if tenant is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                "Tenant could not be resolved. Use the X-Tenant-Subdomain header "
                "or access the API via a tenant subdomain (e.g. club.smashbook.app)."
            ),
        )
    return tenant
