"""
Quick test — searches Google Places for 1 category in Helsinki
and prints results WITHOUT writing to Google Sheets.

Run: python3 test_scraper.py
Make sure GOOGLE_API_KEY is set in config.py first.
"""
import json, sys
sys.path.insert(0, ".")

from config import GOOGLE_API_KEY
if GOOGLE_API_KEY == "YOUR_GOOGLE_API_KEY_HERE":
    print("[!] Set GOOGLE_API_KEY in config.py first")
    sys.exit(1)

from scraper import scrape_city_category

print("Testing: putkiasennus in Helsinki...")
results = scrape_city_category("Helsinki", "putkiasennus", "Putkiasennus")

print(f"\nFound {len(results)} businesses:\n")
for i, biz in enumerate(results[:10], 1):
    print(f"[{i}] {biz['name']}")
    print(f"    Phone:   {biz['phone'] or '—'}")
    print(f"    Website: {biz['website'] or '—'}")
    print()

print(f"With phone:   {sum(1 for b in results if b['phone'])}/{len(results)}")
print(f"With website: {sum(1 for b in results if b['website'])}/{len(results)}")
