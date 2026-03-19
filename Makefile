# ── Docker ────────────────────────────────────────────────────────────────────
up:
	docker-compose up -d

down:
	docker-compose down

restart:
	docker-compose restart api

logs:
	docker-compose logs -f api

build:
	docker-compose build api

# ── Database migrations ───────────────────────────────────────────────────────
migrate:
	docker-compose exec api alembic upgrade head

migrate-down:
	docker-compose exec api alembic downgrade -1

migrate-status:
	docker-compose exec api alembic current

# new migration: make migration msg="add some table"
migration:
	docker-compose exec api alembic revision --autogenerate -m "$(msg)"

# Local variants (no Docker — runs against DATABASE_URL in backend/.env)
migrate-local:
	cd backend && .venv/bin/alembic upgrade head

migrate-down-local:
	cd backend && .venv/bin/alembic downgrade -1

migration-local:
	cd backend && .venv/bin/alembic revision --autogenerate -m "$(msg)"

# ── Database access ───────────────────────────────────────────────────────────

# Open interactive psql shell
db:
	docker-compose exec -it db psql -U padel_user -d padel_db

# Run a SQL statement: make sql q="SELECT * FROM clubs LIMIT 5;"
sql:
	docker-compose exec db psql -U padel_user -d padel_db -c "$(q)"

# ── ERD ───────────────────────────────────────────────────────────────────────
# Generates docs/erd.png using eralchemy2 (must be installed in the api container)
erd:
	eralchemy2 \
		-i "postgresql://padel_user:padel_pass@localhost:5432/padel_db" \
		-o docs/erd.png
	@echo "ERD generated → docs/erd.png"

# ── Misc ──────────────────────────────────────────────────────────────────────
shell:
	docker-compose exec api bash

.PHONY: up down restart logs build migrate migrate-down migrate-status migration db sql shell erd migrate-local migrate-down-local migration-local
