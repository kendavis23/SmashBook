from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1.router import api_router
from app.core.config import get_settings
from app.middleware.tenant import TenantMiddleware

settings = get_settings()

app = FastAPI(
    title=settings.APP_NAME,
    openapi_url=f"{settings.API_V1_PREFIX}/openapi.json",
    docs_url=f"{settings.API_V1_PREFIX}/docs",
)

# Starlette processes middleware in reverse-registration order (last added = outermost).
# TenantMiddleware must wrap everything so request.state.tenant is available to all
# downstream handlers including CORS and auth.
app.add_middleware(TenantMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Tighten per environment
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.API_V1_PREFIX)


@app.get("/healthz")
async def health_check():
    return {"status": "ok"}


