# SmashBook – Tasks

## 🔥 Now (current sprint/focus)

### Core Product — Pricing & Booking Logic (Critical Path)
- [ ] Define pricing model — peak/off-peak, membership tiers, per-court rates
- [ ] Build court availability engine (time slots, conflict detection)
- [ ] Build booking creation flow (reserve → payment → confirm)
- [ ] Cancellation and refund logic
- [ ] Booking modification / rescheduling rules
- [ ] Waitlist logic for fully booked slots

### Technical Foundation
- [ ] Extend SQLAlchemy models with additional capabilities (waitlist, membership tiers, recurring bookings)
- [ ] Configure multi-tenant middleware in FastAPI

---

## 📋 Up Next
- [ ] GCP notifications service (booking confirmations, reminders)
- [ ] Staff dashboard API endpoints
- [ ] Player wallet / credit system

## 🧱 Backlog
- [ ] Stripe payment integration (capture payment at booking)
- [ ] Mobile app scaffolding
- [ ] Analytics pipeline
- [ ] Equipment rental add-ons at booking
- [ ] Recurring booking / membership subscriptions

## 💼 Business Actions
- [ ] **Dom (lawyer)** — intro call, get buy-in, discuss IP/trademark filing and company structure
- [ ] **Javi (club owner)** — demo concept, validate pricing model, explore as pilot club
- [ ] Register smashbook.app or smashbook.ai domain
- [ ] File trademark (post Dom conversation)
- [ ] Grab social handles (@smashbook)

## 🐛 Bugs
- [ ]

## 💡 Ideas / Notes
- Javi could be a great design partner — real operational input on pricing/booking rules
- Multi-tenant: row-level security vs schema-per-tenant decision still pending
- Reference Playtomic pricing model during pricing logic design

---

## ✅ Done

### Product
- [x] SQLAlchemy models for core entities (Court, Booking, User, Pricing)
- [x] FastAPI project structure
- [x] Git repo setup
- [x] .gitignore configuration

### Business
- [x] Naming — SmashBook confirmed, no active trademarks
