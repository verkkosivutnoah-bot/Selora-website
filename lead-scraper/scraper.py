"""
Selora Lead Scraper — Google Maps via SerpAPI
"""

import re
import time
import requests
from typing import Optional, List
from bs4 import BeautifulSoup
import serpapi
from config import SERPAPI_KEY, REQUEST_TIMEOUT, REQUEST_DELAY

# City centre coordinates for tighter Google Maps results
CITY_COORDS = {
    "Helsinki":  "@60.1699,24.9384,13z",
    "Turku":     "@60.4518,22.2666,13z",
    "Oulu":      "@65.0121,25.4651,13z",
    "Jyväskylä": "@62.2426,25.7473,13z",
    "Lahti":     "@60.9827,25.6612,13z",
}

WEB_SESSION = requests.Session()
WEB_SESSION.headers.update({
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "fi-FI,fi;q=0.9",
})


def scrape_city_category(city: str, keyword: str, label: str) -> List[dict]:
    """
    Search Google Maps via SerpAPI for `keyword` in `city`.
    Returns list of lead dicts.
    """
    query = f"{keyword} in {city}, Finland"

    params = {
        "engine":  "google_maps",
        "q":       query,
        "hl":      "fi",
        "api_key": SERPAPI_KEY,
    }
    ll = CITY_COORDS.get(city)
    if ll:
        params["ll"] = ll

    try:
        results = serpapi.search(params)
    except Exception as e:
        print(f"    [!] SerpAPI error: {e}")
        return []

    local_results = results.get("local_results", [])
    leads = []
    for r in local_results:
        lead = _parse_result(r, city, label)
        if lead:
            leads.append(lead)

    return leads


def _parse_result(r: dict, city: str, label: str) -> Optional[dict]:
    name = r.get("title", "").strip()
    if not name:
        return None

    phone   = r.get("phone", "")
    website = _normalize_url(r.get("website", ""))

    return {
        "name":     name,
        "phone":    phone,
        "email":    "",
        "website":  website,
        "city":     city,
        "category": label,
    }


def _normalize_url(url: str) -> str:
    if not url:
        return ""
    url = url.strip().rstrip("/")
    if not url.startswith("http"):
        url = "https://" + url
    return url


# ── Email extraction from company websites ────────────────────────────────────

def extract_email_from_website(url: str) -> str:
    if not url:
        return ""
    email = _find_email_on_page(url)
    if email:
        return email
    base = url.rstrip("/")
    for path in ["/yhteystiedot", "/contact", "/ota-yhteytta"]:
        email = _find_email_on_page(base + path)
        if email:
            return email
        time.sleep(0.3)
    return ""


def _find_email_on_page(url: str) -> str:
    try:
        r = WEB_SESSION.get(url, timeout=REQUEST_TIMEOUT, allow_redirects=True)
        if r.status_code != 200:
            return ""
        soup = BeautifulSoup(r.text, "lxml")
        for link in soup.select("a[href^='mailto:']"):
            em = link["href"].replace("mailto:", "").split("?")[0].strip()
            if em and "@" in em:
                return em
        skip = {"noreply", "no-reply", "example", "sentry", "w3.org", "schema.org"}
        for em in re.findall(r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}", r.text):
            if not any(s in em.lower() for s in skip):
                return em
    except Exception:
        pass
    return ""
