#!/usr/bin/env python3
"""
GitHub Projects v2 bulk importer for Padel Platform sprint plan.
Usage: python3 github_projects_import.py --token YOUR_TOKEN --owner YOUR_GITHUB_USERNAME --repo YOUR_REPO_NAME

Requirements:
  - A GitHub repo must already exist (or will be created)
  - Token needs scopes: repo, project
  - Generate token at: https://github.com/settings/tokens/new
    Select scopes: repo (full), project (full)
"""

import urllib.request
import urllib.error
import json
import argparse
import time
import sys

# ── Sprint data ────────────────────────────────────────────────────────────────

SPRINTS = [
    {
        "id": 1, "name": "Sprint 1 — Foundation: Auth, Tenant & Player Accounts",
        "phase": "MVP", "milestone": "MVP Go-Live",
        "goal": "Players can register, log in, reset passwords and manage their profile. Multi-tenant scaffolding is live.",
        "stories": [
            ("Auth",    "Player: register for an account"),
            ("Auth",    "Player: log in securely with JWT access/refresh tokens"),
            ("Auth",    "Player: reset password via email link"),
            ("Profile", "Player: update profile details (name, photo, contact)"),
            ("Infra",   "Tenant onboarding — create tenant, club, courts in DB"),
            ("Infra",   "Multi-tenant middleware and row-level tenant isolation"),
            ("Infra",   "CI/CD pipeline live (dev > staging > prod on Cloud Run)"),
        ]
    },
    {
        "id": 2, "name": "Sprint 2 — Court Discovery & Real-Time Availability",
        "phase": "MVP", "milestone": "MVP Go-Live",
        "goal": "Players can search courts by date/time, filter by surface type, and see live slot availability.",
        "stories": [
            ("Search", "Player: search available courts by date and time"),
            ("Search", "Player: filter courts by surface type (indoor / outdoor)"),
            ("Search", "Player: view court availability in real time"),
            ("Search", "Player: browse open games to join an existing session"),
            ("Staff",  "Staff: view real-time overview of all court bookings"),
            ("Staff",  "Staff: set court operating hours including seasonal variations"),
        ]
    },
    {
        "id": 3, "name": "Sprint 3 — Core Booking Flow",
        "phase": "MVP", "milestone": "MVP Go-Live",
        "goal": "Players can book courts for up to 4 players, invite others, join open games, and join waitlists.",
        "stories": [
            ("Booking", "Player: book a court for up to four players"),
            ("Booking", "Player: invite other players to a booking (confirm attendance)"),
            ("Booking", "Player: join an open game without organising a full group"),
            ("Booking", "Player: add self to waitlist; get notified when slot opens"),
            ("Booking", "Player: book equipment rental alongside court booking"),
            ("Staff",   "Staff: create, edit, or cancel bookings on behalf of players"),
            ("Staff",   "Staff: create a booking for an open match at a specific skill level"),
            ("Staff",   "Staff: search bookings by player name, date, or court"),
            ("Staff",   "Staff: view daily and weekly booking calendar"),
        ]
    },
    {
        "id": 4, "name": "Sprint 4 — Payments, Wallet & Stripe Integration",
        "phase": "MVP", "milestone": "MVP Go-Live",
        "goal": "End-to-end online payments: card saving, cost splitting, wallet top-up, receipts. MVP go-live gate.",
        "stories": [
            ("Payments",  "Player: pay for booking online via Stripe"),
            ("Payments",  "Player: split cost between players (each pays their share)"),
            ("Payments",  "Player: receive email payment confirmation / Stripe receipt"),
            ("Payments",  "Player: save a payment card via Stripe for fast future checkout"),
            ("Payments",  "Player: view and remove saved payment methods"),
            ("Payments",  "Player: set a default payment method"),
            ("Wallet",    "Player: view wallet balance"),
            ("Wallet",    "Player: top up wallet via saved or new Stripe card"),
            ("Wallet",    "Player: pay for bookings and equipment rentals from wallet"),
            ("Wallet",    "Player: view wallet transaction history"),
            ("Invoices",  "Player: receive Stripe receipt by email after every payment"),
            ("Invoices",  "Player: view and download past invoices in-app"),
            ("Invoices",  "Player: refunds returned to original payment method or wallet"),
            ("Staff",     "Staff: configure Stripe Connect account per club"),
            ("Staff",     "Staff: process in-person payments (cash / card / credit)"),
            ("Staff",     "Staff: issue full or partial refunds for cancelled bookings"),
            ("Staff",     "Staff: view daily revenue summary and transaction log"),
        ]
    },
    {
        "id": 5, "name": "Sprint 5 — Reservation Management & Staff Admin",
        "phase": "MVP", "milestone": "MVP Go-Live",
        "goal": "Players manage their bookings; staff have full admin controls, trainer scheduling, and equipment management.",
        "stories": [
            ("Reservations", "Player: view upcoming bookings"),
            ("Reservations", "Player: cancel a booking"),
            ("Reservations", "Player: receive pre-game reminder notification"),
            ("Reservations", "Player: view match history"),
            ("Staff",        "Staff: block courts for maintenance, events, or private hire"),
            ("Staff",        "Staff: create recurring bookings for leagues / coaching sessions"),
            ("Staff",        "Staff: book courts for corporate events or tournaments"),
            ("Staff",        "Staff: book court for individual or group lesson with trainer"),
            ("Staff",        "Staff: send notifications / messages to players about bookings"),
            ("Staff",        "Staff: view player profiles and booking history"),
            ("Staff",        "Staff: flag or suspend policy-breaching player accounts"),
            ("Staff",        "Staff: manage equipment rental inventory (rackets, balls)"),
            ("Staff",        "Staff: record equipment damage or loss against a booking"),
            ("Trainers",     "Trainer: set and update available working hours"),
            ("Trainers",     "Ops lead: edit trainer hours; view all trainer schedules in one place"),
            ("Trainers",     "Trainer: view upcoming lesson bookings"),
        ]
    },
    {
        "id": 6, "name": "Sprint 6 — Reporting, Support & Skill Management",
        "phase": "MVP", "milestone": "MVP Go-Live",
        "goal": "Staff reporting suite, player support channel, skill tracking — full MVP feature-complete. Ship it.",
        "stories": [
            ("Reporting",   "Staff: generate utilisation reports by court and time period"),
            ("Reporting",   "Staff: view player retention and booking frequency data"),
            ("Reporting",   "Staff: export booking and payment data"),
            ("Reporting",   "Staff: view corporate / tournament booking revenue report"),
            ("Reporting",   "Staff: view revenue breakdown by booking type and court"),
            ("Reporting",   "Staff: view and reconcile Stripe payout records against bank deposits"),
            ("Reporting",   "Staff: view full transaction log with filters (date, player, booking type, payment method)"),
            ("Reporting",   "Staff: export full financial report for a selected period"),
            ("Support",     "Player: contact club support through the app"),
            ("Support",     "Player: report a problem with a booking"),
            ("Support",     "Staff: respond to player support requests in-app"),
            ("Support",     "Staff: post announcements and club news"),
            ("Skills",      "Staff: assign or update a player's skill level (authorised staff only)"),
            ("Skills",      "Staff: view log of skill level changes per player"),
            ("Promotions",  "Staff: apply discounts or promotional codes to bookings"),
        ]
    },
    {
        "id": 7, "name": "Sprint 7 — Dynamic Pricing, Revenue Forecasting & Anomaly Detection",
        "phase": "Phase 1 AI", "milestone": "Phase 1 AI Live",
        "goal": "AI auto-adjusts court prices by demand; revenue forecasting and payment anomaly detection go live.",
        "stories": [
            ("AI Pricing",  "Dynamic AI court pricing: auto-adjust by demand, time of day, day of week"),
            ("AI Pricing",  "AI recommendations: which player segments to target with promotional pricing"),
            ("AI Pricing",  "Anomaly detection: alert staff to unusual revenue patterns (drop / spike in refunds)"),
            ("AI Pricing",  "Club owner: dynamic pricing runs automatically with no manual price changes needed"),
            ("AI Revenue",  "Revenue forecasting with AI-generated weekly and monthly projections"),
            ("AI Insights", "AI insights dashboard: natural-language summaries and action prompts for managers"),
            ("AI Payments", "Alert staff to failed or anomalous payments flagged by AI fraud detection"),
            ("AI Payments", "Club owner: failed payments auto-flagged and retried to minimise revenue leakage"),
        ]
    },
    {
        "id": 8, "name": "Sprint 8 — Gap Detection, Smart Notifications & Autonomous Finance",
        "phase": "Phase 1 AI", "milestone": "Phase 1 AI Live",
        "goal": "AI fills court gaps via targeted offers, smart push notifications, and weather-aware reminders.",
        "stories": [
            ("AI Gaps",    "AI identifies underbooked slots and auto-generates targeted discount offers for eligible players"),
            ("AI Gaps",    "Player: notified of discounted off-peak slots that match their preferences"),
            ("AI Gaps",    "Player: personalised discount offers for off-peak slots based on individual availability"),
            ("AI Notify",  "Staff: AI-generated smart push notifications to players most likely to fill a specific gap"),
            ("AI Notify",  "Player: AI slot suggestions matching typical playing patterns (no manual search needed)"),
            ("AI Weather", "Player: weather-aware alert if poor conditions are forecast for outdoor booking"),
            ("AI Weather", "Club owner: weather and cancellation alerts sent to players automatically"),
            ("AI Wallet",  "Player: app suggests optimal membership tier or wallet top-up based on booking frequency"),
            ("AI Auto",    "Club owner: all bookings, cancellations, waitlist, rescheduling handled automatically"),
            ("AI Auto",    "Club owner: recurring league and coaching bookings self-manage each cycle"),
            ("AI Finance", "Club owner: invoices, receipts, and financial reports auto-generated and distributed"),
            ("AI Finance", "Club owner: card processing, payment splits, refunds, Stripe payouts fully automated"),
            ("AI Comms",   "Club owner: booking confirmations, reminders, and waitlist alerts sent automatically"),
        ]
    },
    {
        "id": 9, "name": "Sprint 9 — Matchmaking, Fill the Court & Cancellation Prediction",
        "phase": "Phase 2 AI", "milestone": "Phase 2 AI Live",
        "goal": "AI matches players by skill for open games; auto-fills partial bookings; predicts cancellations.",
        "stories": [
            ("AI Match",  "Player matched with suitable partner by skill and availability when joining open game"),
            ("AI Match",  "Fill the Court: AI auto-assembles 4 compatible players when a booking has empty spots"),
            ("AI Match",  "App auto-builds skill and preference profile from booking history and match results"),
            ("AI Cancel", "Staff: system predicts likely cancellations 48hrs ahead; offers slots to waitlisted players"),
            ("AI Cancel", "Player: app predicts cancellation likelihood; prompts confirm or early slot release"),
            ("AI Skills", "Player: skill rating auto-updated after each match result is logged (ELO / TrueSkill)"),
            ("AI Skills", "Player: view skill progression over time on a personal development dashboard"),
        ]
    },
    {
        "id": 10, "name": "Sprint 10 — Churn Detection, Segmentation & Operational AI",
        "phase": "Phase 2 AI", "milestone": "Phase 2 AI Live",
        "goal": "Churn prediction, player segmentation, AI staffing recommendations, equipment stock prediction.",
        "stories": [
            ("AI Churn",    "Staff: auto-flag players at risk of churning (no booking in X days) with re-engagement suggestions"),
            ("AI Churn",    "Staff: AI-generated personalised re-engagement messages drafted for at-risk segments"),
            ("AI Churn",    "Club owner: re-engagement campaigns triggered and sent automatically to at-risk players"),
            ("AI Segment",  "Players auto-segmented (casual / competitive / corporate) for targeted comms and promotions"),
            ("AI Staffing", "Ops lead: AI staffing recommendations based on predicted court demand — no over-scheduling"),
            ("AI Equip",    "Staff: system predicts equipment replacement needs from usage frequency and rental history"),
            ("AI Equip",    "Club owner: AI triggers purchase orders automatically when stock depletion is predicted"),
            ("AI Equip",    "Club owner: equipment damage / loss reported in-app; recovery costs logged and charged automatically"),
            ("AI Maint",    "Staff: AI maintenance scheduling recommendations based on court usage — minimal disruption"),
            ("AI Finance",  "Club owner: payment disputes and chargebacks auto-flagged and queued for human review only"),
        ]
    },
    {
        "id": 11, "name": "Sprint 11 — Conversational Booking & AI Support Chatbot",
        "phase": "Phase 3 AI", "milestone": "Full Platform Live",
        "goal": "Natural-language booking assistant and AI support chatbot live for players and staff.",
        "stories": [
            ("AI Conv", "Player: natural language booking — Book me a court Saturday morning with someone around my level"),
            ("AI Chat", "Player: AI assistant handles rescheduling, refund status, and FAQs instantly without waiting for staff"),
            ("AI Chat", "Staff: AI assistant auto-triages and responds to common player support queries"),
            ("AI Chat", "Club owner: AI chatbot handles all routine player queries 24/7 with no support staff required"),
        ]
    },
    {
        "id": 12, "name": "Sprint 12 — Performance Tracking, Video Analysis & Market Intelligence",
        "phase": "Phase 3 AI", "milestone": "Full Platform Live",
        "goal": "AI training recommendations, post-match video analysis from court cameras, competitor pricing intel.",
        "stories": [
            ("AI Perf",   "Player: AI-generated training recommendations based on match performance data"),
            ("AI Video",  "Player: post-match video analysis highlights from court cameras (computer vision)"),
            ("AI Market", "Staff: competitor pricing intelligence surfaced in manager dashboard"),
            ("AI Auto",   "Club owner: all equipment rental bookings fully in-app with zero staff processing needed"),
        ]
    },
]

PHASE_LABELS = {
    "MVP":         {"color": "0075CA", "description": "Core platform — must ship for go-live"},
    "Phase 1 AI":  {"color": "2EA44F", "description": "Quick Wins — dynamic pricing, gap detection, notifications"},
    "Phase 2 AI":  {"color": "8957E5", "description": "Engagement — matchmaking, churn, segmentation"},
    "Phase 3 AI":  {"color": "E3623A", "description": "Differentiation — conversational booking, video analysis"},
}

AREA_COLORS = {
    "Auth": "BFD4F2", "Profile": "BFD4F2", "Infra": "CFD3D7",
    "Search": "C2E0C6", "Booking": "C2E0C6", "Reservations": "C2E0C6",
    "Payments": "FEF2C0", "Wallet": "FEF2C0", "Invoices": "FEF2C0",
    "Staff": "F9D0C4", "Trainers": "F9D0C4",
    "Reporting": "E4C5F9", "Support": "E4C5F9", "Skills": "E4C5F9", "Promotions": "E4C5F9",
    "AI Pricing": "2EA44F", "AI Revenue": "2EA44F", "AI Insights": "2EA44F",
    "AI Payments": "2EA44F", "AI Gaps": "2EA44F", "AI Notify": "2EA44F",
    "AI Weather": "2EA44F", "AI Wallet": "2EA44F", "AI Auto": "2EA44F",
    "AI Finance": "2EA44F", "AI Comms": "2EA44F",
    "AI Match": "8957E5", "AI Cancel": "8957E5", "AI Skills": "8957E5",
    "AI Churn": "8957E5", "AI Segment": "8957E5", "AI Staffing": "8957E5",
    "AI Equip": "8957E5", "AI Maint": "8957E5",
    "AI Conv": "E3623A", "AI Chat": "E3623A",
    "AI Perf": "E3623A", "AI Video": "E3623A", "AI Market": "E3623A",
}


# ── REST helpers ──────────────────────────────────────────────────────────────

def rest(token, method, path, body=None):
    url = f"https://api.github.com{path}"
    data = json.dumps(body).encode() if body else None
    req = urllib.request.Request(url, data=data, method=method, headers={
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
    })
    try:
        with urllib.request.urlopen(req) as r:
            return json.loads(r.read()) if r.read else {}
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        print(f"  HTTP {e.code} on {method} {path}: {body[:200]}")
        raise


def graphql(token, query, variables=None):
    payload = json.dumps({"query": query, "variables": variables or {}}).encode()
    req = urllib.request.Request(
        "https://api.github.com/graphql", data=payload, method="POST",
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req) as r:
        res = json.loads(r.read())
    if "errors" in res:
        raise RuntimeError(f"GraphQL error: {res['errors']}")
    return res["data"]


# ── Setup helpers ─────────────────────────────────────────────────────────────

def get_or_create_label(token, owner, repo, name, color, description=""):
    try:
        rest(token, "GET", f"/repos/{owner}/{repo}/labels/{urllib.parse.quote(name)}")
        return  # already exists
    except:
        pass
    try:
        rest(token, "POST", f"/repos/{owner}/{repo}/labels", {
            "name": name, "color": color, "description": description
        })
    except:
        pass  # may already exist in race


def get_or_create_milestone(token, owner, repo, title):
    milestones = rest(token, "GET", f"/repos/{owner}/{repo}/milestones?state=all&per_page=100")
    for m in milestones:
        if m["title"] == title:
            return m["number"]
    m = rest(token, "POST", f"/repos/{owner}/{repo}/milestones", {"title": title})
    return m["number"]


def create_issue(token, owner, repo, title, body, labels, milestone_number):
    issue = rest(token, "POST", f"/repos/{owner}/{repo}/issues", {
        "title": title,
        "body": body,
        "labels": labels,
        "milestone": milestone_number,
    })
    return issue["number"], issue["html_url"]


def get_user_id(token):
    d = graphql(token, "{ viewer { id login } }")
    return d["viewer"]["id"], d["viewer"]["login"]


def get_repo_id(token, owner, repo):
    d = graphql(token, """
        query($owner: String!, $name: String!) {
            repository(owner: $owner, name: $name) { id }
        }
    """, {"owner": owner, "name": repo})
    return d["repository"]["id"]


def create_project(token, owner_id, title):
    d = graphql(token, """
        mutation($ownerId: ID!, $title: String!) {
            createProjectV2(input: { ownerId: $ownerId, title: $title }) {
                projectV2 { id number url }
            }
        }
    """, {"ownerId": owner_id, "title": title})
    p = d["createProjectV2"]["projectV2"]
    return p["id"], p["number"], p["url"]


def add_issue_to_project(token, project_id, issue_id):
    d = graphql(token, """
        mutation($projectId: ID!, $contentId: ID!) {
            addProjectV2ItemById(input: { projectId: $projectId, contentId: $contentId }) {
                item { id }
            }
        }
    """, {"projectId": project_id, "contentId": issue_id})
    return d["addProjectV2ItemById"]["item"]["id"]


def get_issue_node_id(token, owner, repo, number):
    d = graphql(token, """
        query($owner: String!, $repo: String!, $number: Int!) {
            repository(owner: $owner, name: $repo) {
                issue(number: $number) { id }
            }
        }
    """, {"owner": owner, "repo": repo, "number": number})
    return d["repository"]["issue"]["id"]


import urllib.parse


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Import Padel Platform sprints into GitHub Projects")
    parser.add_argument("--token",      required=True, help="GitHub Personal Access Token (needs repo + project scopes)")
    parser.add_argument("--owner",      required=True, help="GitHub username or org name")
    parser.add_argument("--repo",       required=True, help="Repository name (must already exist)")
    parser.add_argument("--project",    default="Padel Platform — Sprint Plan", help="Project name")
    parser.add_argument("--dry-run",    action="store_true", help="Print issues without creating them")
    args = parser.parse_args()

    total_stories = sum(len(s["stories"]) for s in SPRINTS)

    if args.dry_run:
        print(f"\nDRY RUN — would create {total_stories} issues across {len(SPRINTS)} sprints\n")
        for sprint in SPRINTS:
            print(f"  [{sprint['phase']}] {sprint['name']} ({len(sprint['stories'])} issues)")
        return

    print(f"\nConnecting to GitHub as {args.owner}...")
    user_id, login = get_user_id(args.token)
    print(f"Authenticated as: {login} ({user_id})")

    print(f"\nChecking repo: {args.owner}/{args.repo}...")
    repo_id = get_repo_id(args.token, args.owner, args.repo)
    print(f"Repo found: {repo_id}")

    # ── Labels ────────────────────────────────────────────────────────────────
    print("\nCreating phase labels...")
    for name, cfg in PHASE_LABELS.items():
        get_or_create_label(args.token, args.owner, args.repo, name, cfg["color"], cfg["description"])
        print(f"  Label: {name}")

    print("\nCreating sprint labels...")
    for sprint in SPRINTS:
        label = f"Sprint {sprint['id']}"
        get_or_create_label(args.token, args.owner, args.repo, label, "CFD3D7", sprint["name"])
        print(f"  Label: {label}")

    print("\nCreating area labels...")
    created_area_labels = set()
    for sprint in SPRINTS:
        for area, _ in sprint["stories"]:
            if area not in created_area_labels:
                color = AREA_COLORS.get(area, "EDEDED")
                get_or_create_label(args.token, args.owner, args.repo, area, color)
                created_area_labels.add(area)
    print(f"  {len(created_area_labels)} area labels ready")

    # ── Milestones ────────────────────────────────────────────────────────────
    print("\nCreating milestones...")
    milestone_map = {}
    for sprint in SPRINTS:
        m = sprint["milestone"]
        if m not in milestone_map:
            num = get_or_create_milestone(args.token, args.owner, args.repo, m)
            milestone_map[m] = num
            print(f"  Milestone: {m} (#{num})")

    # ── Project ───────────────────────────────────────────────────────────────
    print(f"\nCreating GitHub Project: '{args.project}'...")
    proj_id, proj_num, proj_url = create_project(args.token, user_id, args.project)
    print(f"  Project created: {proj_url}")

    # ── Issues ────────────────────────────────────────────────────────────────
    created = 0
    print(f"\nCreating {total_stories} issues and adding to project...\n")

    for sprint in SPRINTS:
        print(f"  {sprint['name']}")
        sprint_label = f"Sprint {sprint['id']}"
        milestone_num = milestone_map[sprint["milestone"]]

        for area, story in sprint["stories"]:
            labels = [sprint["phase"], sprint_label, area]
            body = (
                f"**Sprint:** {sprint['name']}\n"
                f"**Phase:** {sprint['phase']}\n"
                f"**Area:** {area}\n\n"
                f"**Sprint Goal:** {sprint['goal']}\n\n"
                f"---\n*User story from Padel Platform v4.0 sprint plan.*"
            )

            issue_num, issue_url = create_issue(
                args.token, args.owner, args.repo,
                story, body, labels, milestone_num
            )
            created += 1

            # Add to project
            node_id = get_issue_node_id(args.token, args.owner, args.repo, issue_num)
            add_issue_to_project(args.token, proj_id, node_id)

            print(f"    [{created}/{total_stories}] #{issue_num}: {story[:55]}...")
            time.sleep(0.3)  # respect secondary rate limits

        print()

    print(f"Done — {created} issues created and added to project.")
    print(f"\nView your project: {proj_url}")
    print(f"View your issues:  https://github.com/{args.owner}/{args.repo}/issues")
    print(f"\nNext steps:")
    print(f"  1. Open the project and switch to Board view (add 'Status' field)")
    print(f"  2. Add an Iteration field named 'Sprint' (2-week cadence)")
    print(f"  3. Filter by sprint label to assign issues to each iteration")


if __name__ == "__main__":
    main()
