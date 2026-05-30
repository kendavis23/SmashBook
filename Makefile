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
	cd backend && .venv/bin/eralchemy2 \
		-i "postgresql://padel_user:padel_pass@localhost:5432/padel_db" \
		-o ../docs/erd.png
	@echo "ERD generated → docs/erd.png"

# Generates docs/SmashBook_ERD.drawio from SQLAlchemy models (no DB connection needed)
erd-drawio:
	docker-compose exec api python scripts/generate_erd_drawio.py docs/SmashBook_ERD.drawio

erd-drawio-local:
	cd backend && .venv/bin/python scripts/generate_erd_drawio.py ../docs/SmashBook_ERD.drawio

# ── GitHub ────────────────────────────────────────────────────────────────────
# Show one raw project item — use this to confirm the sprint field name
project-fields:
	gh project item-list 2 --owner kendavis23 --format json --limit 1 | jq '.'

# Export all issues with sprint data merged in (requires: gh auth login, jq)
issues:
	@gh issue list --limit 1000 --state all --json number,title,body,state,labels,assignees,milestone,createdAt,updatedAt,closedAt,url > /tmp/smashbook_issues.json
	@gh project item-list 2 --owner kendavis23 --format json --limit 1000 > /tmp/smashbook_project.json
	@jq -s \
		'(.[1].items | map(select(.content.type == "Issue")) | map({((.content.number | tostring)): .sprint}) | add) as $$sprints \
		| .[0] | map(. + {sprint: $$sprints[(.number | tostring)]})' \
		/tmp/smashbook_issues.json /tmp/smashbook_project.json > issues.json
	@echo "Exported → issues.json"

# ── Test database ─────────────────────────────────────────────────────────────
test-db-up:
	docker run -d --name smashbook-test-db \
		-e POSTGRES_USER=test -e POSTGRES_PASSWORD=test -e POSTGRES_DB=test \
		-p 5433:5432 postgres:16

test-db-down:
	docker stop smashbook-test-db && docker rm smashbook-test-db

# ── Staging ───────────────────────────────────────────────────────────────────
seed-staging:
	gcloud run jobs execute seed-staging \
		--region=europe-west2 \
		--project=smashbook-488121 \
		--wait

# List Secret Manager secrets attached to the staging Cloud Run API service
staging-api-secrets:
	gcloud run services describe padel-api \
		--project=smashbook-488121 \
		--region=europe-west2 \
		--format=json | jq '.spec.template.spec.containers[0].env[] | select(.valueFrom.secretKeyRef) | {name: .name, secret: .valueFrom.secretKeyRef.name, key: .valueFrom.secretKeyRef.key}'

# ── Staging: court-hold expiry scheduler ──────────────────────────────────────
# Toggle the release-expired-holds Cloud Scheduler job (ad-hoc — note a later
# `terraform apply` resets it to the release_holds_scheduler_paused variable).
scheduler-activate:
	gcloud scheduler jobs resume release-expired-holds \
		--location=europe-west2 --project=smashbook-488121

scheduler-pause:
	gcloud scheduler jobs pause release-expired-holds \
		--location=europe-west2 --project=smashbook-488121

# Show ENABLED / PAUSED
scheduler-status:
	gcloud scheduler jobs describe release-expired-holds \
		--location=europe-west2 --project=smashbook-488121 \
		--format="value(state)"

# Trigger one run now without un-pausing
scheduler-run:
	gcloud scheduler jobs run release-expired-holds \
		--location=europe-west2 --project=smashbook-488121

# Run seed against the local dev DB (api container must be up)
seed-local:
	docker-compose exec api python scripts/seed_staging.py

# ── Stripe ────────────────────────────────────────────────────────────────────
# Create Stripe test connected accounts for all clubs (local DB via Docker)
stripe-connect-local:
	docker-compose exec api python scripts/setup_stripe_test_accounts.py

# Start Cloud SQL Auth Proxy for staging (listens on localhost:5433 to avoid conflict with local Postgres on 5432)
cloud-sql-proxy-staging:
	cloud-sql-proxy --port 5433 smashbook-488121:europe-west2:smashbook-staging &

# Create Stripe test connected accounts for all clubs (staging DB via Cloud SQL proxy)
# Requires: make cloud-sql-proxy-staging running, and STAGING_DB_PASSWORD set
# Uses STRIPE_SECRET_KEY from your environment (must be sk_test_*)
stripe-connect-staging:
	cd backend && \
	DATABASE_URL=postgresql+asyncpg://padel_user:$(STAGING_DB_PASSWORD)@127.0.0.1:5433/padel_db \
	DATABASE_READ_REPLICA_URL=postgresql+asyncpg://padel_user:$(STAGING_DB_PASSWORD)@127.0.0.1:5433/padel_db \
	.venv/bin/python scripts/setup_stripe_test_accounts.py

# Create a Stripe test payment method (tok_visa): make payment-intent
payment-intent:
	curl https://api.stripe.com/v1/payment_methods \
		-u "$(STRIPE_KEY):" \
		-d type=card \
		-d "card[token]=tok_visa"

# ── Local API helpers ─────────────────────────────────────────────────────────
# Get a JWT token for alice@ace.staging: make get-token
get-token:
	curl -s -X POST http://localhost:8080/api/v1/auth/login \
		-H "Content-Type: application/json" \
		-d '{"tenant_subdomain":"ace","email":"alice@ace.staging","password":"Staging1234"}'

# ── Misc ──────────────────────────────────────────────────────────────────────
shell:
	docker-compose exec api bash

.PHONY: up down restart logs build migrate migrate-down migrate-status migration db sql shell erd erd-drawio erd-drawio-local migrate-local migrate-down-local migration-local issues project-fields test-db-up test-db-down seed-staging staging-api-secrets scheduler-activate scheduler-pause scheduler-status scheduler-run seed-local stripe-connect-local stripe-connect-staging cloud-sql-proxy-staging payment-intent get-token
