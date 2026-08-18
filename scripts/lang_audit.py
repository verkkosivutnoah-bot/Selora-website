#!/usr/bin/env python3
"""
Selora language-mixing audit.

i18n-audit.py answers "is this Finnish string translated at all?".
This answers the harder question: "is this text in the language it claims
to be in?" It catches the two failures that actually ship:

  1. A DICT entry whose English value is still Finnish, so switching to EN
     changes nothing and the visitor sees a Finnish heading.
  2. English text hardcoded into the Finnish markup, so Finnish visitors
     see an English heading. The overlay cannot help here: it only ever
     replaces Finnish with English, never the reverse.

Run after ANY copy change:
    python3 scripts/lang-audit.py

Exits 1 if anything is in the wrong language.
"""
import re
import sys
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)

PUBLIC = [
    'index.html', 'palvelut.html', 'hinnoittelu.html',
    'yhteystiedot.html', 'verkkosivusuunnittelu.html', 'esimerkkityot.html',
    'tietosuojaseloste.html', '404.html', 'unsubscribe.html',
]

# Words that are the same in both languages, or are proper nouns. Scoring
# these would only add noise.
# Brand names that are correctly English on the Finnish site too.
BRANDS = {'the green electrician', 'vantage', 'nocturne'}

NEUTRAL = {
    # 'hosting' is spelled the same in Finnish copy, and its -ing ending was
    # scoring as English hard enough to cancel out a real Finnish signal.
    'hosting',
    'selora', 'google', 'gdpr', 'seo', 'wordpress', 'analytics', 'zapier',
    'hubspot', 'stripe', 'notion', 'slack', 'outlook', 'teams', 'zendesk',
    'salesforce', 'pipedrive', 'make', 'zoho', 'freshdesk', 'vantage',
    'nocturne', 'chatbot', 'demo', 'email', 'blogi', 'blog', 'ok',
}

FI_WORDS = {
    'ja', 'on', 'ei', 'se', 'että', 'joka', 'jotka', 'kun', 'niin', 'myös',
    'vain', 'tai', 'mutta', 'kuin', 'sinä', 'sinun', 'sinulle', 'sinut',
    'me', 'meidän', 'he', 'ne', 'oma', 'omat', 'mitä', 'miten', 'kuinka',
    'miksi', 'missä', 'milloin', 'kaikki', 'jokainen', 'yksi', 'kaksi', 'kolme',
    'sivusto', 'sivustot', 'sivu', 'sivut', 'verkkosivut', 'verkkosivu',
    'asiakas', 'asiakkaat', 'asiakkaita', 'asiakkaan', 'yritys', 'yrityksesi',
    'palvelu', 'palvelut', 'hinta', 'hinnat', 'lisää', 'katso', 'lue',
    'varaa', 'saat', 'teet', 'teemme', 'saa', 'voit', 'ilman', 'kanssa',
    'ovat', 'olet', 'olemme', 'sekä', 'jo', 'vielä', 'aina', 'heti',
    'nopeasti', 'hyvin', 'juuri', 'noin', 'yli', 'alle', 'kerran',
}

EN_WORDS = {
    'the', 'a', 'an', 'and', 'or', 'but', 'of', 'to', 'in', 'on', 'at',
    'for', 'with', 'from', 'by', 'as', 'that', 'this', 'these', 'those',
    'is', 'are', 'was', 'were', 'be', 'been', 'being', 'will', 'would',
    'can', 'could', 'should', 'your', 'you', 'we', 'our', 'they', 'their',
    'it', 'its', 'have', 'has', 'had', 'do', 'does', 'not', 'no', 'yes',
    'what', 'how', 'why', 'when', 'where', 'which', 'who', 'more', 'most',
    'every', 'each', 'all', 'website', 'websites', 'site', 'sites', 'page',
    'pages', 'customer', 'customers', 'business', 'price', 'pricing',
    'read', 'book', 'see', 'get', 'built', 'build', 'design', 'services',
    'contact', 'about', 'home', 'free', 'fast', 'without', 'once',
}

# Endings that are strongly Finnish. Checked on words of 5+ characters so
# short English words ("session", "linen") do not trip them.
FI_SUFFIXES = (
    'ssa', 'ssä', 'sta', 'stä', 'lla', 'llä', 'lta', 'ltä', 'lle', 'ksi',
    'nen', 'isen', 'jen', 'den', 'ien', 'mme', 'nne', 'nsa', 'nsä', 'kin',
    'han', 'hän', 'ään', 'ään', 'ista', 'istä', 'ille', 'oita', 'öitä',
    'uus', 'yys', 'tta', 'ttä', 'maan', 'mään', 'vat', 'vät',
)
EN_SUFFIXES = ('ing', 'tion', 'sion', 'ment', 'ness', 'able', 'ible', 'ously')

WORD_RE = re.compile(r"[A-Za-zÄÖÅäöå']+")


def words(text):
    return [w.lower() for w in WORD_RE.findall(text) if w.lower() not in NEUTRAL]


def is_proper_name(text):
    """Person or brand names are the same in both languages, so an entry that
    leaves them untouched is correct, not a missing translation."""
    ws = WORD_RE.findall(text)
    if not ws or len(ws) > 4:
        return False
    if any(w.lower() in FI_WORDS or w.lower() in EN_WORDS for w in ws):
        return False
    return all(w[0].isupper() for w in ws)


def classify(text):
    """Return 'fi', 'en' or None (too short / ambiguous / neutral)."""
    ws = words(text)
    if not ws:
        return None

    fi = sum(1 for w in ws if w in FI_WORDS)
    en = sum(1 for w in ws if w in EN_WORDS)

    # Finnish orthography is decisive, but only outside proper nouns: a
    # Finnish surname inside an English sentence does not make it Finnish.
    common = re.sub(r'\b[A-ZÄÖÅ][a-zäöå]+', '', text[1:])
    if re.search(r'[äöÄÖ]', text[0] + common):
        fi += 2
    # Suffix scoring skips proper nouns for the same reason: "Mäkinen" ends
    # in -nen whatever language the sentence around it is in.
    raw = WORD_RE.findall(text)
    plain = [w.lower() for i, w in enumerate(raw) if i == 0 or not w[0].isupper()]
    for w in plain:
        if w in NEUTRAL:
            continue
        if len(w) >= 6 and w.endswith(FI_SUFFIXES):
            fi += 1
        if len(w) >= 6 and w.endswith(EN_SUFFIXES):
            en += 1
    if fi > en:
        return 'fi'
    if en > fi:
        return 'en'
    return None


def dict_pairs():
    js = open('i18n.js', encoding='utf-8').read()
    m = re.search(r'const DICT = \{(.*?)^  \};', js, re.DOTALL | re.MULTILINE)
    if not m:
        print('ERROR: could not locate DICT in i18n.js')
        sys.exit(2)
    body = m.group(1)
    pairs = re.findall(
        r"^\s*'((?:[^'\\]|\\.)*)'\s*:\s*\n?\s*'((?:[^'\\]|\\.)*)'\s*,",
        body, re.MULTILINE)
    return [(k.replace("\\'", "'"), v.replace("\\'", "'")) for k, v in pairs]


def visible_strings(path):
    html = open(path, encoding='utf-8').read()
    html = re.sub(r'<script\b.*?</script>', '', html, flags=re.DOTALL | re.I)
    html = re.sub(r'<style\b.*?</style>', '', html, flags=re.DOTALL | re.I)
    html = re.sub(r'<!--.*?-->', '', html, flags=re.DOTALL)
    out = []
    for t in re.findall(r'>([^<>]+)<', html):
        t = re.sub(r'\s+', ' ', t).strip()
        if len(t) < 4:
            continue
        if re.fullmatch(r"[\d\s.,€%+/·:;→←★|'-]+", t):
            continue
        out.append(t)
    return out


def main():
    pairs = dict_pairs()
    keys = {k for k, _ in pairs}
    problems = 0

    # 1. English value that is still Finnish
    untranslated = []
    for k, v in pairs:
        if is_proper_name(k):
            continue
        if not v.strip() or k == v:
            if k == v and classify(k) == 'fi':
                untranslated.append((k, v, 'value identical to the Finnish key'))
            continue
        if classify(v) == 'fi':
            untranslated.append((k, v, 'English value reads as Finnish'))

    if untranslated:
        problems += len(untranslated)
        print('\n=== DICT entries whose English side is still Finnish (%d) ===' % len(untranslated))
        for k, v, why in untranslated:
            print('  %s' % why)
            print('    FI: %s' % k[:100])
            print('    EN: %s' % (v[:100] if v else '(empty)'))

    # 2. English hardcoded in the Finnish markup
    en_in_fi = {}
    values = {v for _, v in pairs}
    for page in PUBLIC:
        if not os.path.exists(page):
            continue
        for t in visible_strings(page):
            if t in keys or t in values:
                continue  # the overlay owns this string
            if t.strip().lower() in BRANDS:
                continue
            if classify(t) == 'en':
                en_in_fi.setdefault(t, set()).add(page)

    if en_in_fi:
        problems += len(en_in_fi)
        print('\n=== English text sitting in the Finnish markup (%d) ===' % len(en_in_fi))
        print('    (Finnish visitors see these in English. Rewrite in Finnish and')
        print('     add a DICT entry, or confirm it is a brand name.)')
        for t, pages in sorted(en_in_fi.items()):
            print('  [%s]' % ', '.join(sorted(pages)))
            print('    %s' % t[:110])

    if not problems:
        print('DICT pairs checked: %d' % len(pairs))
        print('language audit: OK, nothing in the wrong language')
        return 0

    print('\n%d problem(s). Fix, then re-run.' % problems)
    return 1


if __name__ == '__main__':
    sys.exit(main())
