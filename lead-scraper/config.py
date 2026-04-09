"""
Selora Lead Scraper — Configuration
"""

# ── API keys ──────────────────────────────────────────────────────────────────
SERPAPI_KEY      = "aa54c58c45646fd0ce2ed481ec7315c16c47bca3b03111f2dc59400a08a9cbe5"
CREDENTIALS_FILE = "credentials.json"   # service account — already in this folder

# ── Cities ────────────────────────────────────────────────────────────────────
CITIES = ["Helsinki", "Turku", "Oulu", "Jyväskylä", "Lahti"]

# ── Business categories (English for Google Maps, Finnish label for sheet) ────
CATEGORIES = [
    ("plumber",               "Putkiasennus"),
    ("electrician",           "Sähköasennus"),
    ("auto repair shop",      "Autokorjaamo"),
    ("HVAC contractor",       "Ilmastointi/LVIS"),
    ("construction company",  "Rakennusyritys"),
    ("cleaning service",      "Siivouspalvelu"),
    ("hair salon",            "Parturi/Kampaamo"),
    ("massage therapist",     "Hieronta"),
    ("physiotherapy",         "Fysioterapia"),
    ("dentist",               "Hammaslääkäri"),
    ("painter",               "Maalaus"),
    ("locksmith",             "Lukkopalvelu"),
    ("taxi service",          "Taksi"),
    ("glazier",               "Lasitus"),
    ("car service",           "Autonhuolto"),
    ("renovation contractor", "Remontointi"),
    ("home care service",     "Kotipalvelu"),
    ("security company",      "Vartiointi"),
    ("transport company",     "Kuljetus"),
    ("landscaping",           "Piha/Puutarha"),
]

# ── Google Sheets — one spreadsheet per city ──────────────────────────────────
CITY_SHEET_IDS = {
    "Helsinki":  "19cjeJu5g0Usu7VZnQKPe_trzAqduP92tvqzo98qxqLs",
    "Turku":     "1jNlV9aT6fwvRl29nzeUc1WxnZHiEwqTHxphRRn_GTUM",
    "Oulu":      "1p8KASwAk0_VxnfebfC6ieeJhO5qbzoJf1fp6YP5PCmA",
    "Jyväskylä": "1CHXI-YkvPOwYbqM6L-QLq9RdDCVW1793CMw4gwyPUqk",
    "Lahti":     "1Ec6QkQvGJnXXoE0TmQOCCXFJWD4uJoYdtcWVp8UYUxc",
}

# ── Settings ──────────────────────────────────────────────────────────────────
TARGET_TOTAL               = 2000
SCRAPE_EMAILS_FROM_WEBSITES = True
REQUEST_DELAY              = 0.5
REQUEST_TIMEOUT            = 10
