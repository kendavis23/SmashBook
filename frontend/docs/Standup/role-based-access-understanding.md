_Created at: 2026-04-17_

# Role-Based Access Control — Understanding & Clarifications

---

## 1. Applications Overview

We have two frontend applications:

| Application  | Audience                    | Roles Available                                            |
| ------------ | --------------------------- | ---------------------------------------------------------- |
| `web-player` | Players / end-users         | `player` only                                              |
| `web-staff`  | Internal staff / management | `owner`, `admin`, `staff`, `trainer`, `ops_lead`, `viewer` |

> **Note:** The `player` role exists **only** in `web-player`. All other roles are exclusive to `web-staff`.

---

## 2. Role Hierarchy & Capabilities

```
owner
  └── Can do everything admin can + CREATE a club

admin
  └── Can do everything staff can + CREATE a court + (CREATE a club) MANAGE club settings

ops_lead
  └── All staff capabilities + trainer schedule management

staff
  └── Manage courts, player bookings, reservations

trainer
  └── Training-specific access (no club/court creation or management)

viewer
  └── Read-only access to club data

player  (web-player only)
  └── Book/reserve courts as a player
```

---

## 3. Role Permission Matrix

| Capability                                     | owner | admin | ops_lead | staff | trainer | viewer | player |
| ---------------------------------------------- | :---: | :---: | :------: | :---: | :-----: | :----: | :----: |
| **Create a club**                              |  ✅   |  ✅   |    ❌    |  ❌   |   ❌    |   ❌   |   ❌   |
| **Manage club** (settings, pricing, hours)     |  ✅   |  ✅   |    ❌    |  ❌   |   ❌    |   ❌   |   ❌   |
| **Create a court**                             |  ✅   |  ✅   |    ❌    |  ❌   |   ❌    |   ❌   |   ❌   |
| **Manage a court**                             |  ✅   |  ✅   |    ✅    |  ✅   |   ❌    |   ❌   |   ❌   |
| **Manage player bookings / reservations**      |  ✅   |  ✅   |    ✅    |  ✅   |   ❌    |   ❌   |   ❌   |
| **Trainer schedule management (All Trainers)** |  ✅   |  ✅   |    ✅    |  ❌   |   ❌    |   ❌   |   ❌   |
| **Trainer schedule management (Own only)**     |  ✅   |  ✅   |    ✅    |  ❌   |   ✅    |   ❌   |   ❌   |
| **View club data**                             |  ✅   |  ✅   |    ✅    |  ✅   |   ✅    |   ✅   |   ❌   |
| **Book / reserve a court (as player)**         |  ❌   |  ❌   |    ❌    |  ❌   |   ❌    |   ❌   |   ✅   |

---

## Questions

### Q1 - Multi-Club / Multi-Role Scenario - does it valid senario? -> Yes this is Valid

A single user account can hold **different roles across different clubs**. This is important to understand for both UI and API behavior.

```
Example User: john@example.com

  Club A  →  role: admin
  Club B  →  role: staff
  Club C  →  role: viewer
```

#### What this means in practice:

- When John logs in and views **Club A**, he should see admin-level features (manage settings, create courts, etc.)
- When John switches to **Club B**, he should only see staff-level features
- When John views **Club C**, he gets read-only access
- The frontend must **scope all UI and API calls to the active club context**
- The backend must validate role permissions **per club**, not globally

---

### Q2 — login API behavior -> Yes (Backend provide the clubs details for all roles)

Is it possible for the backend to return club information for all roles?

> Currently, it only returns data for staff users. For admin and owner roles, I need to call the /clubs endpoint after login to fetch the list of clubs.

```json
{
    "clubs": [
        { "club_id": "club_1", "club_name": "Arena A", "role": "admin" },
        { "club_id": "club_2", "club_name": "Arena B", "role": "staff" }
    ]
}
```

---

### Q3 — `owner` vs `admin` for club creation -> Yes (Admin Can create a club)

> Does the admin role have permission to create a club, or is this restricted to the owner role only?

---
