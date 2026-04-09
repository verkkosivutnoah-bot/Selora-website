# Selora Lead Scraper — Setup Guide

Finds 400 Finnish SMBs via Google Maps API and writes to your 5 Google Sheets.
Authenticates as **verkkosivut.noah@gmail.com** — no service account needed.

---

## Step 1 — Google Maps API Key

1. Go to [https://console.cloud.google.com](https://console.cloud.google.com) — sign in as verkkosivut.noah@gmail.com
2. Create a new project (or use an existing one)
3. Go to **APIs & Services → Library** → search **"Places API"** → Enable it
4. Go to **APIs & Services → Credentials → Create Credentials → API Key**
5. Copy the key and paste into `config.py`:
   ```python
   GOOGLE_API_KEY = "AIzaSy..."
   ```

**Cost:** Google gives $200/month free. This scraper uses ~$3–5 total for 400 businesses.

---

## Step 2 — Google Sheets OAuth Credentials

This lets the scraper write to your sheets as your own Google account.

1. In the same project, go to **APIs & Services → Library** → search **"Google Sheets API"** → Enable it
2. Go to **APIs & Services → OAuth consent screen**
   - Choose **External** → Fill in app name (anything, e.g. "Selora Scraper") → Save
   - Under **Test users** → add `verkkosivut.noah@gmail.com`
3. Go to **APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID**
   - Application type: **Desktop app** → Create
   - Click **Download JSON** → save it as `credentials.json` in the `lead-scraper/` folder

---

## Step 3 — Run

```bash
cd lead-scraper
python3 main.py
```

**First run only:** a browser window will open — log in as verkkosivut.noah@gmail.com and click **Allow**. After that, `oauth_token.json` is saved and no browser is needed again.

---

## What gets written

Each spreadsheet gets these columns:

| Column | Description |
|--------|-------------|
| Yrityksen nimi | Company name |
| Puhelinnumero | Phone number |
| Sähköposti | Email (scraped from company website) |
| Verkkosivusto | Website URL |
| Toimiala | Business category |

---

## Spreadsheets

| City | Sheet |
|------|-------|
| Helsinki | [open](https://docs.google.com/spreadsheets/d/19cjeJu5g0Usu7VZnQKPe_trzAqduP92tvqzo98qxqLs) |
| Turku | [open](https://docs.google.com/spreadsheets/d/1jNlV9aT6fwvRl29nzeUc1WxnZHiEwqTHxphRRn_GTUM) |
| Oulu | [open](https://docs.google.com/spreadsheets/d/1p8KASwAk0_VxnfebfC6ieeJhO5qbzoJf1fp6YP5PCmA) |
| Jyväskylä | [open](https://docs.google.com/spreadsheets/d/1CHXI-YkvPOwYbqM6L-QLq9RdDCVW1793CMw4gwyPUqk) |
| Lahti | [open](https://docs.google.com/spreadsheets/d/1Ec6QkQvGJnXXoE0TmQOCCXFJWD4uJoYdtcWVp8UYUxc) |

---

## Business categories (20)

Putkiasennus, Sähköasennus, Autokorjaamo, Ilmastointi/LVIS, Rakennusyritys, Siivouspalvelu, Parturi/Kampaamo, Hieronta, Fysioterapia, Hammaslääkäri, Maalaus, Lukkopalvelu, Taksi, Lasitus, Autonhuolto, Remontointi, Kotipalvelu, Vartiointi, Kuljetus, Piha/Puutarha
