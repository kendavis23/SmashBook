#!/usr/bin/env python3
"""
Onboard a new SmashBook tenant.

Usage:
    python utilities/onboard_tenant.py \
        --api-url https://staging.smashbook.app/api/v1 \
        --platform-key <PLATFORM_API_KEY>

The script prompts for all required fields interactively, or you can pass
--json-file to supply a pre-filled payload (useful for bulk onboarding).
"""

import argparse
import json
import os
import sys

import httpx


def build_payload_interactive() -> dict:
    print("\n=== Tenant ===")
    name = input("Tenant name (e.g. 'Padel City London'): ").strip()
    subdomain = input("Subdomain slug (e.g. 'padel-city-london'): ").strip()
    plan_id = input("Plan UUID: ").strip()

    print("\n=== Club ===")
    club_name = input("Club name: ").strip()
    address = input("Address (optional, press enter to skip): ").strip() or None
    currency = input("Currency [GBP]: ").strip() or "GBP"

    print("\n=== Owner account ===")
    email = input("Owner email: ").strip()
    full_name = input("Owner full name: ").strip()
    password = input("Temporary password: ").strip()

    courts = []
    surface_options = "indoor / outdoor / crystal / artificial_grass"
    print(f"\n=== Courts (surface types: {surface_options}) ===")
    while True:
        court_name = input("Court name (or press enter to finish): ").strip()
        if not court_name:
            break
        surface = input(f"  Surface type [{surface_options}]: ").strip()
        has_lighting = input("  Has lighting? [y/N]: ").strip().lower() == "y"
        surcharge = None
        if has_lighting:
            raw = input("  Lighting surcharge amount (or enter to skip): ").strip()
            surcharge = raw if raw else None
        courts.append({
            "name": court_name,
            "surface_type": surface,
            "has_lighting": has_lighting,
            "lighting_surcharge": surcharge,
        })

    if not courts:
        print("Error: at least one court is required.")
        sys.exit(1)

    return {
        "name": name,
        "subdomain": subdomain,
        "plan_id": plan_id,
        "club": {"name": club_name, "address": address, "currency": currency},
        "courts": courts,
        "owner": {"email": email, "full_name": full_name, "password": password},
    }


def main():
    parser = argparse.ArgumentParser(description="Onboard a new SmashBook tenant")
    parser.add_argument(
        "--api-url",
        default=os.getenv("SMASHBOOK_API_URL", "http://localhost:8080/api/v1"),
    )
    parser.add_argument("--platform-key", default=os.getenv("PLATFORM_API_KEY"))
    parser.add_argument("--json-file", help="Path to a JSON file containing the full payload")
    args = parser.parse_args()

    if not args.platform_key:
        print("Error: --platform-key or PLATFORM_API_KEY env var is required.")
        sys.exit(1)

    payload = json.load(open(args.json_file)) if args.json_file else build_payload_interactive()

    print(f"\nOnboarding '{payload['name']}' against {args.api_url} ...")

    response = httpx.post(
        f"{args.api_url}/admin/onboard",
        json=payload,
        headers={"X-Platform-Key": args.platform_key},
        timeout=30,
    )

    if response.status_code == 201:
        result = response.json()
        print("\nTenant provisioned successfully!")
        print(f"  Tenant ID : {result['tenant_id']}")
        print(f"  Club ID   : {result['club_id']}")
        print(f"  Courts    : {len(result['courts'])} created")
        for court in result["courts"]:
            print(f"             - {court['name']} ({court['surface_type']}) id={court['id']}")
    else:
        print(f"\nError {response.status_code}:")
        print(response.text)
        sys.exit(1)


if __name__ == "__main__":
    main()
