# -*- coding: utf-8 -*-
"""Aja jokaisen muokkauksen jälkeen ennen julkaisua:

    python3 finalize.py

1. Pakkaa assets/css/style.css -> style.min.css ja päivittää ?v=-versiotunnuksen sivuille
2. Laskee sivujen inline-skriptien SHA-256-tiivisteet vercel.jsonin CSP-otsakkeeseen
   (muuten muokattu inline-skripti estyisi tuotannossa).
"""
import base64, hashlib, json, re

PAGES = ['index.html', 'ruokalista.html', 'en/index.html', 'en/menu.html']


def minify(src='assets/css/style.css', out='assets/css/style.min.css'):
    css = open(src, encoding='utf-8').read()
    css = re.sub(r'/\*.*?\*/', '', css, flags=re.S)
    css = re.sub(r'\s+', ' ', css)
    css = re.sub(r'\s*([{}:;,>~])\s*', r'\1', css).replace(';}', '}').strip()
    open(out, 'w', encoding='utf-8').write(css)
    v = hashlib.md5(css.encode()).hexdigest()[:8]
    for p in PAGES:
        s = open(p, encoding='utf-8').read()
        s = re.sub(r'(assets/css/style\.min\.css)\?v=\w+', rf'\1?v={v}', s)
        open(p, 'w', encoding='utf-8').write(s)
    return v


def appjs_version():
    v = hashlib.md5(open('assets/js/app.js', 'rb').read()).hexdigest()[:8]
    for p in PAGES:
        s = open(p, encoding='utf-8').read()
        s = re.sub(r'(assets/js/app\.js)\?v=\w+', rf'\1?v={v}', s)
        open(p, 'w', encoding='utf-8').write(s)
    return v


def csp():
    hashes = set()
    for p in PAGES:
        html = open(p, encoding='utf-8').read()
        for body in re.findall(r'<script(?![^>]*\bsrc=)[^>]*>(.*?)</script>', html, re.S):
            hashes.add("'sha256-%s'" % base64.b64encode(hashlib.sha256(body.encode()).digest()).decode())
    cfg = json.load(open('vercel.json', encoding='utf-8'))
    for rule in cfg['headers']:
        for h in rule['headers']:
            if h['key'] == 'Content-Security-Policy':
                h['value'] = re.sub(r"script-src [^;]+", "script-src 'self' " + ' '.join(sorted(hashes)), h['value'])
    json.dump(cfg, open('vercel.json', 'w', encoding='utf-8'), indent=2, ensure_ascii=False)
    open('vercel.json', 'a', encoding='utf-8').write('\n')
    return len(hashes)


if __name__ == '__main__':
    print('css', minify(), '| app.js', appjs_version(), '| CSP-hasheja', csp())
