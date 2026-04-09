#!/usr/bin/env python3
"""
Selora Lead Scraper
Finds Finnish SMBs via Google Maps / Places API.
Writes each city to its own Google Spreadsheet.

Usage:
    python3 main.py

Configure GOOGLE_API_KEY and CREDENTIALS_FILE in config.py first.
See README.md for full setup instructions.
"""

import sys
import time
import os
from config import (
    CITIES, CATEGORIES, TARGET_TOTAL,
    SCRAPE_EMAILS_FROM_WEBSITES,
    CREDENTIALS_FILE, CITY_SHEET_IDS,
)
from scraper import scrape_city_category, extract_email_from_website
import sheets as gsheets


def validate_config():
    errors = []
    if not os.path.exists(CREDENTIALS_FILE):
        errors.append("credentials.json not found — see README.md for setup")
    if errors:
        print("\n[!] Setup required:")
        for e in errors:
            print(f"    • {e}")
        print()
        sys.exit(1)


def run():
    validate_config()

    print("=" * 62)
    print("  SELORA LEAD SCRAPER")
    print(f"  Cities:     {', '.join(CITIES)}")
    print(f"  Categories: {len(CATEGORIES)}")
    print(f"  Target:     {TARGET_TOTAL} total businesses")
    print("=" * 62)

    total_added  = 0
    all_collected = []

    # Global dedup across all cities so no business appears twice
    global_seen: set = set()

    print(f"\n[1/3] Checking existing sheet data...")
    for city in CITIES:
        try:
            ws = gsheets.open_city_sheet(city)
            names = gsheets.get_existing_names(ws)
            global_seen |= names
            count = gsheets.get_row_count(ws)
            print(f"  {city:<14} {count} existing rows")
        except Exception as e:
            print(f"  {city:<14} [!] Could not open sheet: {e}")
    print(f"  {len(global_seen)} total existing names loaded")

    print(f"\n[2/3] Scraping via Google Maps / Places API...")

    for city in CITIES:
        if total_added >= TARGET_TOTAL:
            print(f"\n  Target of {TARGET_TOTAL} reached. Stopping.")
            break

        print(f"\n── {city.upper()} " + "─" * max(1, 50 - len(city)))
        print(f"  Spreadsheet: https://docs.google.com/spreadsheets/d/{CITY_SHEET_IDS[city]}")

        ws = gsheets.open_city_sheet(city)
        gsheets.setup_headers(ws)
        city_seen = gsheets.get_existing_names(ws)

        city_results = []

        for keyword, label in CATEGORIES:
            if total_added + len(city_results) >= TARGET_TOTAL:
                break

            print(f"\n  [{label}]")
            try:
                found = scrape_city_category(city, keyword, label)
            except Exception as e:
                print(f"  [!] Error: {e}")
                found = []

            new = []
            for biz in found:
                key = biz["name"].strip().lower()
                if key and key not in global_seen and key not in city_seen:
                    city_seen.add(key)
                    global_seen.add(key)
                    new.append(biz)

            print(f"    → {len(new)} new unique leads")
            city_results.extend(new)

        # Email enrichment
        if SCRAPE_EMAILS_FROM_WEBSITES:
            need_email = [b for b in city_results if not b["email"] and b["website"]]
            if need_email:
                print(f"\n  Enriching {len(need_email)} websites for emails...")
                for i, biz in enumerate(need_email, 1):
                    biz["email"] = extract_email_from_website(biz["website"])
                    if i % 20 == 0:
                        print(f"    ... {i}/{len(need_email)} checked")
                    time.sleep(0.3)

        # Write to this city's spreadsheet
        if city_results:
            added = gsheets.append_businesses(ws, city_results)
            total_added += added
            all_collected.extend(city_results)
            has_email   = sum(1 for b in city_results if b["email"])
            has_phone   = sum(1 for b in city_results if b["phone"])
            has_website = sum(1 for b in city_results if b["website"])
            print(
                f"\n  [✓] {city}: {added} businesses written"
                f"  |  phone: {has_phone}  email: {has_email}  website: {has_website}"
            )
        else:
            print(f"\n  [~] {city}: no new results")

    print("\n" + "=" * 62)
    print("[3/3] COMPLETE")
    print(f"  Total added this run:  {total_added}")
    print(f"  With phone:            {sum(1 for b in all_collected if b['phone'])}")
    print(f"  With email:            {sum(1 for b in all_collected if b['email'])}")
    print(f"  With website:          {sum(1 for b in all_collected if b['website'])}")
    print()
    by_city = {}
    for b in all_collected:
        by_city.setdefault(b["city"], 0)
        by_city[b["city"]] += 1
    for city, count in by_city.items():
        print(f"  {city:<14} {count} businesses")
    print("=" * 62)


if __name__ == "__main__":
    run()
