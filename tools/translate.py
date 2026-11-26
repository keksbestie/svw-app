#!/usr/bin/env python3
"""Uebersetzt lang/de.json mit DeepL nach lang/<sprache>.json.
Nutzung:  DEEPL_KEY=xxxx python3 tools/translate.py en es
Nur NEUE oder GEAENDERTE deutsche Texte werden uebersetzt (spart Zeichen).
Der Schluessel bleibt auf deinem Rechner und kommt nie ins Repository."""
import os, sys, json, urllib.request, urllib.parse
KEY = os.environ.get('DEEPL_KEY')
if not KEY: sys.exit('DEEPL_KEY fehlt (export DEEPL_KEY=...)')
HOST = 'api-free.deepl.com' if KEY.endswith(':fx') else 'api.deepl.com'
TARGET = {'en': 'EN-GB', 'es': 'ES', 'fr': 'FR', 'it': 'IT', 'nl': 'NL', 'pl': 'PL', 'pt': 'PT-PT', 'tr': 'TR'}
de = json.load(open('lang/de.json', encoding='utf8'))
for lang in sys.argv[1:] or ['en', 'es']:
    path = 'lang/%s.json' % lang
    old = json.load(open(path, encoding='utf8')) if os.path.exists(path) else {}
    src = json.load(open('lang/.%s.src.json' % lang, encoding='utf8')) if os.path.exists('lang/.%s.src.json' % lang) else {}
    todo = [k for k, v in de.items() if k not in old or src.get(k) != v]
    print(lang, ':', len(todo), 'Texte,', sum(len(de[k]) for k in todo), 'Zeichen')
    for i in range(0, len(todo), 40):
        chunk = todo[i:i + 40]
        body = urllib.parse.urlencode([('text', de[k]) for k in chunk] + [('source_lang', 'DE'), ('target_lang', TARGET[lang]), ('formality', 'prefer_less')]).encode()
        req = urllib.request.Request('https://%s/v2/translate' % HOST, body, {'Authorization': 'DeepL-Auth-Key ' + KEY})
        res = json.load(urllib.request.urlopen(req))
        for k, tr in zip(chunk, res['translations']): old[k] = tr['text']
    for k in list(old):
        if k not in de: del old[k]
    json.dump(old, open(path, 'w', encoding='utf8'), ensure_ascii=False, indent=1, sort_keys=True)
    json.dump({k: de[k] for k in old}, open('lang/.%s.src.json' % lang, 'w', encoding='utf8'), ensure_ascii=False, indent=1, sort_keys=True)
