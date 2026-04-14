Breadcrumb

┌──────────────────────────────────────────────────────────────────────────────┐
│ │
│ Courts Dashboard [ Refresh ] [ Add Court ] │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ FILTER / CONTROL BAR (Sticky) │
│ 🔍 Search [Surface type ▼] date timefrom timeto │
└──────────────────────────────────────────────────────────────────────────────┘

┌───────────────────────────────┬──────────────────────────────────────────────┐
│ COURT LIST │ AVAILABILITY PANEL │
│ │ │
│ (Paginated Table) │ Court 1 [ X ] │
│ name, surface, lighting, │ 📅 Date: [ Today ▼ ] │
│ status,action │ │
│ │ Zoom: [ 1h ] [ 30m ] [ 7m ] │
│ │ │
│ │ Time | Timeline │
│ │----------------------------------------------│
│ │ 06:00 AM | ███░░░██████ │
│ │ 07:00 AM | ██░░░░░█████ │
│ │ 08:00 AM | ███████████ │
│ │ │
│ │ (Scroll ↓) │
│ │ │
│ │ ─────── NOW ─────── │
│ │ │
│ │ Selected: 6:07 → 6:28 │
│ │ │
│ │ [ Book Slot ] │
└───────────────────────────────┴──────────────────────────────────────────────┘

---

## | Date: 12 Apr 2026 | View: Day | Filters | + Booking |

## | Time | Court 1 | Court 2 | Court 3 | Court 4 |

| 06:00 | | | | |
| 06:10 | Booking | | Blocked | |
| 06:20 | Booking | | Blocked | |
| 06:30 | | Booking | | |
| ... | | | | |
| 22:00 | | | | |

---

APP START
│
▼
┌───────────────────────┐
│ Splash Screen │
│ Logo + Loading │
└─────────┬─────────────┘
│
▼
(Check Auth State)
/ \
 ▼ ▼
┌────────────┐ ┌────────────────────┐
│ Auth │ │ Main App (Tabs) │
└────┬───────┘ └─────────┬──────────┘
│ │
▼ ▼

================ AUTH FLOW =================

┌────────────────────────────┐
│ Login Screen │
│ - Email / Password │
│ - Social Login │
│ - CTA: Login │
│ - Links: Register / Forgot │
└──────────┬─────────────────┘
│
┌───────┴────────┐
▼ ▼
┌──────────────┐ ┌──────────────────┐
│ Register │ │ Forgot Password │
│ - Name │ │ - Email │
│ - Email │ │ - Reset Link │
│ - Password │ └──────────────────┘
└──────┬───────┘
│
▼
(Success → Go to App)

================================================

================ MAIN APP =======================

        BOTTOM TAB NAVIGATION

┌──────────────────────────────────────────────┐
│ Home | Book | + | My Games | Profile │
└──────────────────────────────────────────────┘

---

## 🏠 HOME TAB

┌──────────────────────────────┐
│ Home Screen │
│ - Location │
│ - Search Bar │
│ - Filters (Today, Nearby) │
│ - Available Courts (scroll) │
│ - Open Games Feed │
└──────────┬───────────────────┘
│
┌───────┴─────────────┐
▼ ▼

┌──────────────────────┐ ┌─────────────────────────┐
│ Court Details │ │ Open Game Details │
│ - Images │ │ - Players │
│ - Pricing │ │ - Join Button │
│ - Availability CTA │ └────────────┬────────────┘
└──────────┬───────────┘ │
│ ▼
▼ ┌──────────────────┐
┌──────────────────────────────┐ │ Join Game Flow │
│ Availability Screen │ │ - Confirm Join │
│ (Time Slot Grid) │ └──────────────────┘
│ - Select Time │
│ - Select Court │
│ - CTA: Book Now │
└──────────┬───────────────────┘
│
▼
→ Goes to BOOK FLOW

---

## 📅 BOOK TAB (Main Conversion Flow)

┌──────────────────────────────┐
│ Booking Flow (Step 1) │
│ - Select Court & Time │
└──────────┬───────────────────┘
▼
┌──────────────────────────────┐
│ Step 2: Add Players │
│ - Invite Friends │
│ - Fill Slots │
└──────────┬───────────────────┘
▼
┌──────────────────────────────┐
│ Step 3: Price Split │
│ - Auto Split │
│ - Edit Share │
└──────────┬───────────────────┘
▼
┌──────────────────────────────┐
│ Step 4: Payment │
│ - Wallet / UPI / Card │
└──────────┬───────────────────┘
▼
┌──────────────────────────────┐
│ Confirmation Screen ✅ │
│ - Booking Details │
│ - Add to Calendar │
│ - Share / Invite │
└──────────────────────────────┘

---

## 🎮 MY GAMES TAB

┌──────────────────────────────┐
│ Upcoming Games │
│ - List of bookings │
│ - CTA: View Details │
└──────────┬───────────────────┘
▼
┌──────────────────────────────┐
│ Game Details │
│ - Players │
│ - Cancel / Edit │
└──────────┬───────────────────┘
▼

Tabs inside My Games:
┌───────────────┬───────────────┬──────────────┐
│ Upcoming │ History │ Waitlist │
└───────────────┴───────────────┴──────────────┘

History:
┌──────────────────────────────┐
│ Past Matches │
│ - Replay / Book Again │
└──────────────────────────────┘

Waitlist:
┌──────────────────────────────┐
│ Waitlist Screen │
│ - Position in Queue │
│ - Leave Button │
└──────────────────────────────┘

---

## 👤 PROFILE TAB

┌──────────────────────────────┐
│ Profile Screen │
│ - Name + Avatar │
│ - Skill Level │
│ - Settings │
└──────────┬───────────────────┘
▼

Sub Screens:

┌──────────────────────────────┐
│ Payments │
│ - Wallet │
│ - Cards / UPI │
└──────────────────────────────┘

┌──────────────────────────────┐
│ Invoices │
│ - Download PDF │
└──────────────────────────────┘

┌──────────────────────────────┐
│ Support │
│ - Chat / FAQ │
└──────────────────────────────┘

================================================

🔔 NOTIFICATION FLOW

Push → Tap → Deep Link:

- booking.confirmed → Confirmation Screen
- reminder → Game Details
- waitlist.slot_available → Availability Screen
- invite → Game Details (Join)
- payment.failed → Payment Screen

================================================
