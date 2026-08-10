#!/usr/bin/env python3
"""
Selora i18n coverage audit.

Finds Finnish strings that are visible on the site but have no English
entry in i18n.js, which means they silently stay Finnish when a visitor
switches to EN.

Run after ANY copy change:
    python3 scripts/i18n-audit.py

Exits 1 if anything is missing, so it can gate a commit.
"""
import re, sys, glob, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)

PUBLIC = [
    'index.html', 'palvelut.html', 'hinnoittelu.html', 'blogi.html',
    'yhteystiedot.html', 'verkkosivusuunnittelu.html',
    'tietosuojaseloste.html', '404.html', 'unsubscribe.html',
]

FI_CHARS = 'äöÄÖ'
FI_WORDS = {
    'ja', 'on', 'ei', 'joka', 'jotka', 'sinun', 'sinulle', 'sinä', 'me', 'meidän',
    'asiakas', 'asiakkaita', 'asiakkaat', 'sivusto', 'sivut', 'verkkosivut',
    'kertamaksu', 'arvostelu', 'arvostelut', 'nopeat', 'hinnat', 'hinta',
    'katso', 'lue', 'lisää', 'varaa', 'ratkaisee', 'tuovat', 'palvelu', 'palvelut',
    'yritys', 'yrityksesi', 'kaikki', 'mitä', 'miten', 'kuinka', 'sekä', 'tai',
}


def load_keys():
    js = open('i18n.js', encoding='utf-8').read()
    m = re.search(r'const DICT = \{(.*?)^  \};', js, re.DOTALL | re.MULTILINE)
    if not m:
        print('ERROR: could not locate DICT in i18n.js')
        sys.exit(2)
    keys = set(re.findall(r"^\s*'((?:[^'\\]|\\.)*)'\s*:", m.group(1), re.MULTILINE))
    keys |= {k.replace("\\'", "'") for k in keys}
    return keys


def is_finnish(t):
    if any(c in t for c in FI_CHARS):
        return True
    words = set(re.findall(r'[a-zA-ZäöåÄÖÅ]+', t.lower()))
    return bool(words & FI_WORDS)


def strings_in(path):
    html = open(path, encoding='utf-8').read()
    html = re.sub(r'<script\b.*?</script>', '', html, flags=re.DOTALL | re.I)
    html = re.sub(r'<style\b.*?</style>', '', html, flags=re.DOTALL | re.I)
    html = re.sub(r'<!--.*?-->', '', html, flags=re.DOTALL)

    out = []
    for t in re.findall(r'>([^<>]+)<', html):
        t = re.sub(r'\s+', ' ', t).strip()
        if len(t) < 2:
            continue
        if re.fullmatch(r'[\d\s.,€%+/·:;→←★|-]+', t):
            continue
        out.append(t)
    for attr in ('placeholder', 'title', 'alt', 'aria-label'):
        for v in re.findall(attr + r'="([^"]+)"', html):
            v = re.sub(r'\s+', ' ', v).strip()
            if len(v) > 2:
                out.append(v)
    return out


def main():
    keys = load_keys()
    missing = {}
    for page in PUBLIC:
        if not os.path.exists(page):
            continue
        for t in strings_in(page):
            if is_finnish(t) and t not in keys:
                missing.setdefault(t, set()).add(page)

    print(f'DICT entries: {len(keys)}')
    if not missing:
        print('i18n coverage: OK, no untranslated visible strings')
        return 0

    print(f'\nMISSING EN translations: {len(missing)}\n')
    for t, pages in sorted(missing.items()):
        print(f"  [{', '.join(sorted(pages))}]")
        print(f"    '{t}': '',")
    print('\nAdd these to DICT in i18n.js, then re-run.')
    return 1


if __name__ == '__main__':
    sys.exit(main())
