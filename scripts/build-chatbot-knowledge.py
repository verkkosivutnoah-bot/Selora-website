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

Each page becomes one section (title, url, description, text) rather than one
flat blob. api/chat.js picks the handful of sections relevant to what the
visitor asked instead of sending the whole site on every call — the site grew
past what a free-tier model's tokens-per-minute budget can take in one
request, so dumping everything every time started failing outright.
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
]
# tietosuojaseloste.html is deliberately excluded: it is 10k+ chars of legal
# boilerplate that blew the knowledge base past Groq's per-request token cap
# (see RULES_FI below — the model already points GDPR questions at the page
# itself instead of quoting it verbatim).

# Chrome that repeats on every page and tells the chatbot nothing.
BOILERPLATE = {
    'Etusivu', 'Palvelut', 'Hinnoittelu', 'Yhteystiedot', 'Blogi', 'SELORA',
    'Hyppää sisältöön', 'Tietosuojaseloste', 'Varaa demo →', 'Lue lisää',
    'Lue lisää ▾', 'Hylkää', 'Hyväksy kaikki', 'Tallenna valinnat',
    'Välttämättömät', 'Analytiikka', 'AINA PÄÄLLÄ', 'FI', 'EN',
    'Tämä sivusto käyttää evästeitä', 'Katso sivusto →', 'Valitse…',
    'Varaa kartoitus →', 'Varaa maksuton kartoitus →', 'Pyydä tarjous →',
}

# Decorative glyphs (accordion chevrons, etc.) that carry no information and
# would otherwise break translation lookups since they have no DICT entry.
DECORATIVE = re.compile(r'^[▼→←★]+$')

# ✓ / ✕ read fine as symbols to a person but are ambiguous once a table row is
# flattened to plain text, so spell them out in both languages.
CHECK_WORDS = {'✓': ('kyllä', 'yes'), '✕': ('ei', 'no')}

# Slogan halves ('Ensivaikutelma' / 'ratkaisee kaiken.') read fine split
# across two elements on the page, but flattened into the knowledge base they
# are just noise: no digit, no currency, short, and the fact they gesture at
# is always restated in a nearby full sentence that survives this filter.
# Cut these rather than the sentences, since the model answers from facts,
# not taglines, and every page duplicating this filler was most of what
# pushed a single request over Groq's per-request token cap.
def _is_slogan_fluff(t):
    if len(t.split()) > 4:
        return False
    if re.search(r'[0-9€%]', t):
        return False
    if t.rstrip().endswith(':'):
        return False
    return True


def strip_tags(html_fragment):
    return re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', ' ', html_fragment)).strip()


def cell_nodes(html_fragment):
    """Text nodes inside a fragment, in order. A merged multi-node string
    ('Verkkosivustopalvelu' + a <br> + a sentence) rarely has a single
    matching DICT entry, but each node on its own usually does."""
    parts = re.split(r'<[^>]+>', html_fragment)
    return [t for t in (re.sub(r'\s+', ' ', p).strip() for p in parts) if t]


def translate_cell(nodes, en):
    """(fi_text, en_text) for a cell's text nodes joined back into one
    string. en_text is None if any node has no DICT translation — an English
    sentence half in Finnish is worse than a dropped line."""
    fi_words, en_words = [], []
    ok = True
    for n in nodes:
        if DECORATIVE.fullmatch(n):
            continue
        if n in CHECK_WORDS:
            fi_w, en_w = CHECK_WORDS[n]
        else:
            fi_w, en_w = n, en.get(n)
        fi_words.append(fi_w)
        if en_w:
            en_words.append(en_w)
        else:
            ok = False
    return ' '.join(fi_words), (' '.join(en_words) if ok else None)


def _inline(lines):
    """Splice plain statements back into the HTML as if they were text nodes,
    so the generic >text< scan below picks them up in place, with the same
    dedup/boilerplate filtering as everything else on the page."""
    return ''.join('>' + l + '<' for l in lines)


def _balanced_div(html, start):
    """html[start:] begins with an opening <div ...> tag. Return (block,
    end_index) for the matching closing tag, since a plain non-greedy regex
    can't handle the nested <div>s inside a package card."""
    depth = 0
    for m in re.finditer(r'<div\b|</div>', html[start:]):
        depth += -1 if m.group(0) == '</div>' else 1
        if depth == 0:
            end = start + m.end()
            return html[start:end], end
    return None, None


def extract_tables(html, en):
    """A table row flattened to plain text loses its column headers —
    'Avainsanatutkimus' next to a bare checkmark means nothing on its own.
    Rewrite each row as one self-contained statement: 'label — header: value,
    header: value'. A single-cell row (colspan, used as a section divider)
    becomes a prefix for the rows under it instead of an orphan bullet."""
    pairs = []

    def repl(m):
        table = m.group(0)
        thead_m = re.search(r'<thead>(.*?)</thead>', table, re.DOTALL)
        tbody_m = re.search(r'<tbody>(.*?)</tbody>', table, re.DOTALL)
        if not thead_m or not tbody_m:
            return table
        header_htmls = re.findall(r'<th[^>]*>(.*?)</th>', thead_m.group(1), re.DOTALL)
        if len(header_htmls) < 2:
            return table
        # A header may carry its price in a nested <br><span>; the row
        # statements only need the package name.
        headers = [translate_cell(cell_nodes(re.split(r'<br\s*/?>', h, flags=re.I)[0]), en)
                   for h in header_htmls]

        fi_lines = []
        section_fi, section_en = None, None
        for row in re.findall(r'<tr[^>]*>(.*?)</tr>', tbody_m.group(1), re.DOTALL):
            cells = re.findall(r'<td[^>]*>(.*?)</td>', row, re.DOTALL)
            if not cells:
                continue
            if len(cells) == 1:
                section_fi, section_en = translate_cell(cell_nodes(cells[0]), en)
                continue
            n = min(len(cells), len(headers))
            vals = [translate_cell(cell_nodes(c), en) for c in cells[:n]]
            hdrs = headers[:n]

            fi_pairs = ', '.join('%s: %s' % (hdrs[i][0], vals[i][0]) for i in range(1, n))
            prefix_fi = (section_fi + ' – ') if section_fi else ''
            fi_line = '%s%s — %s' % (prefix_fi, vals[0][0], fi_pairs)
            fi_lines.append(fi_line)

            en_ok = (section_fi is None or section_en) and all(h[1] for h in hdrs) and all(v[1] for v in vals)
            en_line = None
            if en_ok:
                en_pairs = ', '.join('%s: %s' % (hdrs[i][1], vals[i][1]) for i in range(1, n))
                prefix_en = (section_en + ' – ') if section_en else ''
                en_line = '%s%s — %s' % (prefix_en, vals[0][1], en_pairs)
            pairs.append((fi_line, en_line))
        return _inline(fi_lines)

    new_html = re.sub(r'<table\b[^>]*>.*?</table>', repl, html, flags=re.DOTALL)
    return new_html, pairs


def _card_line(name, desc, note, price, items, includes_word):
    line = name
    if price:
        line += ' (%s%s)' % (price, ', ' + note if note else '')
    if desc:
        line += ' — ' + desc
    if items:
        line += ' %s: %s.' % (includes_word, '; '.join(items))
    return line


def extract_pkg_cards(html, en):
    """A pricing card's <li> features read fine inside the card but become
    unattributed fragments once flattened — 'CRM-integraatio' on its own
    bullet doesn't say which package has it. Fold each card into one
    statement naming the package once for all its features.

    The recurring-maintenance card (.upkeep) is the same shape and has the
    same problem, so it reuses this by mirroring the pkg-* element names."""
    pairs = []
    out, pos = [], 0
    for m in re.finditer(r'<div class="(?:pkg-card|upkeep)[ "][^"]*"[^>]*>', html):
        if m.start() < pos:
            continue
        out.append(html[pos:m.start()])
        block, end = _balanced_div(html, m.start())
        if block is None:
            out.append(html[m.start():m.end()])
            pos = m.end()
            continue

        name_m = re.search(r'<h3 class="(?:pkg|upkeep)-name">(.*?)</h3>', block, re.DOTALL)
        for_m = re.search(r'<p class="(?:pkg|upkeep)-for">(.*?)</p>', block, re.DOTALL)
        price_m = re.search(r'<span class="(?:pkg|upkeep)-price">(.*?)</span>', block, re.DOTALL)
        note_m = re.search(r'<p class="(?:pkg|upkeep)-price-note">(.*?)</p>', block, re.DOTALL)
        feats = re.findall(r'<li>(.*?)</li>', block, re.DOTALL)

        if name_m:
            name_fi, name_en = translate_cell(cell_nodes(name_m.group(1)), en)
            desc_fi, desc_en = translate_cell(cell_nodes(for_m.group(1)), en) if for_m else ('', '')
            note_fi, note_en = translate_cell(cell_nodes(note_m.group(1)), en) if note_m else ('', '')
            price = strip_tags(price_m.group(1)) if price_m else ''
            feat_pairs = [translate_cell(cell_nodes(f), en) for f in feats]

            fi_line = _card_line(name_fi, desc_fi, note_fi, price, [f[0] for f in feat_pairs], 'Sisältää')
            en_ok = name_en and (not for_m or desc_en) and (not note_m or note_en) and all(f[1] for f in feat_pairs)
            en_line = _card_line(name_en, desc_en, note_en, price, [f[1] for f in feat_pairs], 'Includes') if en_ok else None

            pairs.append((fi_line, en_line))
            out.append(_inline([fi_line]))
        else:
            out.append(block)
        pos = end
    out.append(html[pos:])
    return ''.join(out), pairs


def extract_faq(html, en):
    """A FAQ answer is meaningless without its question once the two become
    separate bullets several lines apart. Keep them as one statement."""
    pairs = []

    def repl(m):
        block = m.group(1)
        qm = re.search(r'<summary class="faq-q">(.*?)</summary>', block, re.DOTALL)
        am = re.search(r'<p class="faq-a">(.*?)</p>', block, re.DOTALL)
        if not qm or not am:
            return m.group(0)
        q_fi, q_en = translate_cell(cell_nodes(qm.group(1)), en)
        a_fi, a_en = translate_cell(cell_nodes(am.group(1)), en)
        fi_line = 'Kysymys: %s Vastaus: %s' % (q_fi, a_fi)
        en_line = ('Question: %s Answer: %s' % (q_en, a_en)) if (q_en and a_en) else None
        pairs.append((fi_line, en_line))
        return _inline([fi_line])

    new_html = re.sub(r'<details class="faq-item">(.*?)</details>', repl, html, flags=re.DOTALL)
    return new_html, pairs


def extract_feat_items(html, en):
    """Same problem as the FAQ, on the feature accordion: a bullet like
    'Otsikot ja CTA-tekstit' only means something under its own title."""
    pairs = []

    def repl(m):
        block = m.group(1)
        title_m = re.search(r'<span class="feat-item-title">(.*?)</span>', block, re.DOTALL)
        if not title_m:
            return m.group(0)
        desc_m = re.search(r'<p class="feat-item-desc">(.*?)</p>', block, re.DOTALL)
        bullets = re.findall(r'<li>(.*?)</li>', block, re.DOTALL)

        title_fi, title_en = translate_cell(cell_nodes(title_m.group(1)), en)
        desc_fi, desc_en = translate_cell(cell_nodes(desc_m.group(1)), en) if desc_m else ('', '')
        bul_pairs = [translate_cell(cell_nodes(b), en) for b in bullets]

        fi_line = _card_line(title_fi, desc_fi, '', '', [b[0] for b in bul_pairs], 'Sisältää')
        en_ok = title_en and (not desc_m or desc_en) and all(b[1] for b in bul_pairs)
        en_line = _card_line(title_en, desc_en, '', '', [b[1] for b in bul_pairs], 'Includes') if en_ok else None

        pairs.append((fi_line, en_line))
        return _inline([fi_line])

    new_html = re.sub(r'<details class="feat-item">(.*?)</details>', repl, html, flags=re.DOTALL)
    return new_html, pairs


# Dedup is global across pages, not per page: nav, footer, cookie banner and
# CTA copy repeats on every page verbatim, and duplicating it once per page
# was a big share of what pushed a single chat request over Groq's per-
# request token cap. First occurrence (in PAGES order) wins.
SEEN_GLOBAL = set()


def visible_text(path, en):
    """Visible copy, in document order, duplicates dropped. Structured
    blocks (tables, pricing cards, FAQ/feature accordions) are pulled out
    first and rewritten as self-contained statements, so the generic scan
    below never emits a fact-bearing fragment with no context."""
    html = open(path, encoding='utf-8').read()
    html = re.sub(r'<script\b.*?</script>', '', html, flags=re.DOTALL | re.I)
    html = re.sub(r'<style\b.*?</style>', '', html, flags=re.DOTALL | re.I)
    html = re.sub(r'<!--.*?-->', '', html, flags=re.DOTALL)

    structured = []
    for extractor in (extract_tables, extract_pkg_cards, extract_faq, extract_feat_items):
        html, pairs = extractor(html, en)
        structured += pairs

    out = []
    for raw in re.findall(r'>([^<>]+)<', html):
        t = re.sub(r'\s+', ' ', raw).strip()
        if len(t) < 3 or t in SEEN_GLOBAL or t in BOILERPLATE:
            continue
        if re.fullmatch(r"[\d\s.,€%+/·:;→←★|'-]+", t):
            continue
        if _is_slogan_fluff(t):
            continue
        SEEN_GLOBAL.add(t)
        out.append(t)
    return out, structured


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
        lines, structured = visible_text(path, en)
        total_fi += len(lines)
        sections.append({
            'title': title,
            'url': url,
            'description': meta_description(path),
            'content': lines,
            'structured': structured,
        })

    fi_blocks, en_blocks = [], []
    structured_total = structured_covered = 0
    for s in sections:
        fi_blocks.append('## %s  (%s)\n%s\n\n%s' % (
            s['title'], s['url'], s['description'], '\n'.join('- ' + l for l in s['content'])))
        # Only lines the dictionary actually covers; an untranslated line would
        # otherwise put Finnish into the English knowledge base.
        en_lines = [en[l] for l in s['content'] if l in en and en[l].strip()]
        for fi_line, en_line in s['structured']:
            structured_total += 1
            if en_line:
                structured_covered += 1
                en_lines.append(en_line)
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
    print('structured rows : %d (%d translated to English)' % (structured_total, structured_covered))
    print('written         : api/site-knowledge.js')
    if covered < total_fi:
        print('\nnote: %d lines have no English entry, so they are omitted from the'
              % (total_fi - covered))
        print('English knowledge base. Run scripts/i18n-audit.py to see which.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
