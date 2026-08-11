#!/usr/bin/env python3
"""
Build the chatbot's knowledge base from the site itself.

The chatbot used to answer from a system prompt someone typed by hand. That
prompt went stale the moment the site changed, and by the time the chatbot was
archived it was still describing the AI receptionist, a product that no longer
exists. Anything hand-maintained drifts, so this reads the pages instead.

It extracts the visible Finnish copy from every public page, pairs it with the
English from the i18n dictionary, and writes api/site-knowledge.js. Run it
after any copy change and the chatbot knows the new text:

    python3 scripts/build-chatbot-knowledge.py

Deliberately not clever. No embeddings, no chunking, no vector store: the whole
site is a few thousand words, which fits in a system prompt with room to spare.
A retrieval layer here would be machinery without a problem to solve.
"""
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)
sys.path.insert(0, os.path.join(ROOT, 'scripts'))

from lang_audit import dict_pairs  # noqa: E402

# Pages the chatbot should be able to answer about, in the order a visitor
# would meet them. Archived pages are deliberately absent: if it is not on the
# site, the chatbot must not offer it.
PAGES = [
    ('index.html', 'Etusivu', '/'),
    ('palvelut.html', 'Palvelut', '/palvelut.html'),
    ('verkkosivusuunnittelu.html', 'Verkkosivusuunnittelu', '/verkkosivusuunnittelu.html'),
    ('hinnoittelu.html', 'Hinnoittelu', '/hinnoittelu.html'),
    ('yhteystiedot.html', 'Yhteystiedot', '/yhteystiedot.html'),
    ('tietosuojaseloste.html', 'Tietosuojaseloste', '/tietosuojaseloste.html'),
]

# Chrome that repeats on every page and tells the chatbot nothing.
BOILERPLATE = {
    'Etusivu', 'Palvelut', 'Hinnoittelu', 'Yhteystiedot', 'Blogi', 'SELORA',
    'Hyppää sisältöön', 'Tietosuojaseloste', 'Varaa demo →', 'Lue lisää',
    'Lue lisää ▾', 'Hylkää', 'Hyväksy kaikki', 'Tallenna valinnat',
    'Välttämättömät', 'Analytiikka', 'AINA PÄÄLLÄ', 'FI', 'EN',
    'Tämä sivusto käyttää evästeitä', 'Katso sivusto →', 'Valitse…',
    'Varaa kartoitus →', 'Varaa maksuton kartoitus →', 'Pyydä tarjous →',
}


def visible_text(path):
    """Visible copy, in document order, duplicates dropped."""
    html = open(path, encoding='utf-8').read()
    html = re.sub(r'<script\b.*?</script>', '', html, flags=re.DOTALL | re.I)
    html = re.sub(r'<style\b.*?</style>', '', html, flags=re.DOTALL | re.I)
    html = re.sub(r'<!--.*?-->', '', html, flags=re.DOTALL)

    out, seen = [], set()
    for raw in re.findall(r'>([^<>]+)<', html):
        t = re.sub(r'\s+', ' ', raw).strip()
        if len(t) < 3 or t in seen or t in BOILERPLATE:
            continue
        if re.fullmatch(r"[\d\s.,€%+/·:;→←★|'-]+", t):
            continue
        seen.add(t)
        out.append(t)
    return out


def meta_description(path):
    html = open(path, encoding='utf-8').read()
    m = re.search(r'<meta name="description" content="([^"]+)"', html)
    return m.group(1) if m else ''


def main():
    en = dict(dict_pairs())
    sections, total_fi = [], 0

    for path, title, url in PAGES:
        if not os.path.exists(path):
            print('skipped, missing: %s' % path)
            continue
        lines = visible_text(path)
        total_fi += len(lines)
        sections.append({
            'title': title,
            'url': url,
            'description': meta_description(path),
            'content': lines,
        })

    fi_blocks, en_blocks = [], []
    for s in sections:
        fi_blocks.append('## %s  (%s)\n%s\n\n%s' % (
            s['title'], s['url'], s['description'], '\n'.join('- ' + l for l in s['content'])))
        # Only lines the dictionary actually covers; an untranslated line would
        # otherwise put Finnish into the English knowledge base.
        en_lines = [en[l] for l in s['content'] if l in en and en[l].strip()]
        en_blocks.append('## %s  (%s)\n%s' % (
            s['title'], s['url'], '\n'.join('- ' + l for l in en_lines)))

    covered = sum(1 for s in sections for l in s['content'] if l in en)
    header = (
        '/* GENERATED FILE, DO NOT EDIT BY HAND.\n'
        '   Built from the live pages by scripts/build-chatbot-knowledge.py.\n'
        '   Re-run that script after any copy change, or the chatbot answers\n'
        '   from stale content. Editing this file directly will be overwritten.\n'
        '*/\n'
    )
    body = 'const SITE_KNOWLEDGE = {\n  fi: %s,\n  en: %s\n};\n\nmodule.exports = { SITE_KNOWLEDGE };\n' % (
        json.dumps('\n\n'.join(fi_blocks), ensure_ascii=False),
        json.dumps('\n\n'.join(en_blocks), ensure_ascii=False),
    )
    open('api/site-knowledge.js', 'w', encoding='utf-8').write(header + body)

    print('pages           : %d' % len(sections))
    print('Finnish lines   : %d' % total_fi)
    print('English covered : %d of %d' % (covered, total_fi))
    print('written         : api/site-knowledge.js')
    if covered < total_fi:
        print('\nnote: %d lines have no English entry, so they are omitted from the'
              % (total_fi - covered))
        print('English knowledge base. Run scripts/i18n-audit.py to see which.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
