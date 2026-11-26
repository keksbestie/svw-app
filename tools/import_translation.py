#!/usr/bin/env python3
"""Wandelt tools/tr/<sprache>.txt (Zeilen 'Nummer|Text', Nummer = Position in
den sortierten Schluesseln von lang/de.json) in lang/<sprache>.json um."""
import json, sys
de = json.load(open('lang/de.json', encoding='utf8'))
keys = sorted(de)
for lang in sys.argv[1:]:
    out = {}
    for line in open('tools/tr/%s.txt' % lang, encoding='utf8').read().split('\n'):
        if not line.strip(): continue
        n, txt = line.split('|', 1)
        out[keys[int(n)]] = txt
    missing = [k for k in keys if k not in out]
    print(lang, len(out), 'von', len(keys), 'fehlend:', len(missing))
    json.dump(out, open('lang/%s.json' % lang, 'w', encoding='utf8'), ensure_ascii=False, indent=1, sort_keys=True)
