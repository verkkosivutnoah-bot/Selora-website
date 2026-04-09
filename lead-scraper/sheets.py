"""
Selora Lead Scraper — Google Sheets integration
Uses service account: lead-scraper@refined-bolt-490522-t0.iam.gserviceaccount.com
"""

import gspread
from typing import Set, List
from google.oauth2.service_account import Credentials
from config import CITY_SHEET_IDS, CREDENTIALS_FILE

SCOPES = [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive",
]

HEADER_ROW = ["Yrityksen nimi", "Puhelinnumero", "Sähköposti", "Verkkosivusto", "Toimiala"]

_BLUE  = {"red": 0.114, "green": 0.306, "blue": 0.847}
_WHITE = {"red": 1.0,   "green": 1.0,   "blue": 1.0}

_client = None


def _get_client() -> gspread.Client:
    global _client
    if _client is None:
        creds = Credentials.from_service_account_file(CREDENTIALS_FILE, scopes=SCOPES)
        _client = gspread.authorize(creds)
    return _client


def open_city_sheet(city: str) -> gspread.Worksheet:
    return _get_client().open_by_key(CITY_SHEET_IDS[city]).sheet1


def setup_headers(ws: gspread.Worksheet):
    if ws.row_values(1) and ws.row_values(1)[0] == HEADER_ROW[0]:
        return
    ws.insert_row(HEADER_ROW, index=1)
    ws.format("A1:E1", {
        "textFormat": {"bold": True, "foregroundColor": _WHITE},
        "backgroundColor": _BLUE,
        "horizontalAlignment": "CENTER",
    })
    ws.freeze(rows=1)
    print("  [✓] Headers written")


def get_existing_names(ws: gspread.Worksheet) -> Set[str]:
    try:
        col = ws.col_values(1)
        return set(n.strip().lower() for n in col[1:] if n.strip())
    except Exception:
        return set()


def append_businesses(ws: gspread.Worksheet, businesses: List[dict]) -> int:
    if not businesses:
        return 0
    rows = [[b.get("name",""), b.get("phone",""), b.get("email",""), b.get("website",""), b.get("category","")] for b in businesses]
    ws.append_rows(rows, value_input_option="USER_ENTERED")
    return len(rows)


def get_row_count(ws: gspread.Worksheet) -> int:
    try:
        return max(0, len(ws.get_all_values()) - 1)
    except Exception:
        return 0
