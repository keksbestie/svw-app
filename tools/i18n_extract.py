#!/usr/bin/env python3
"""Zieht feste deutsche Texte aus index.html, setzt data-i18n-Schluessel
und schreibt lang/de.json. Mehrfach ausfuehrbar (bereits markierte Elemente
werden uebersprungen). Rechtstexte (Impressum, Datenschutz, AGB) bleiben deutsch."""
import re, json, html, sys, os, unicodedata
SRC = 'index.html'
s = open(SRC, encoding='utf8').read()
lines = s.split('\n')
# Bereiche, die nicht uebersetzt werden (Rechtstexte), als Zeichenpositionen
def line_off(n):  # Zeichenposition des Beginns von Zeile n (1-basiert)
    return sum(len(l) + 1 for l in lines[:n - 1])
def find_marker(marker):
    i = s.find(marker); return i
skip = []
for a, b in (('id="page-impressum"', '<!-- ONBOARDING OVERLAY -->'),):
    pass
def page_range(page_id, end_marker):
    a = s.find('id="%s"' % page_id)
    b = s.find(end_marker, a)
    return (a, b)
skip.append(page_range('page-impressum', '<div id="page-calendar"'))
skip.append(page_range('page-datenschutz', '<!-- ONBOARDING OVERLAY -->'))
for m in re.finditer(r'<(script|style)\b.*?</\1>', s, re.S): skip.append((m.start(), m.end()))
for m in re.finditer(r'<!--.*?-->', s, re.S): skip.append((m.start(), m.end()))
def skipped(p): return any(a <= p < b for a, b in skip)

try: de = json.load(open('lang/de.json', encoding='utf8'))
except Exception: de = {}
by_text = {v: k for k, v in de.items()}

def slug(t):
    t = unicodedata.normalize('NFKD', t).encode('ascii', 'ignore').decode()
    t = re.sub(r'[^a-zA-Z0-9]+', '_', t).strip('_').lower()
    return t[:28].strip('_') or 'txt'
def page_of(p):
    last = 'app'
    for m in re.finditer(r'<div id="(page-[a-z]+|[a-zA-Z]+(?:Overlay|Modal))"', s[:p]): last = m.group(1).replace('page-', '')
    return last[:14]
def key_for(text, pos):
    if text in by_text: return by_text[text]
    k = '%s.%s' % (page_of(pos), slug(text)); base = k; n = 2
    while k in de: k = '%s_%d' % (base, n); n += 1
    de[k] = text; by_text[text] = k; return k

changed = 0
# 1) Blatt-Elemente: nur Text, keine Kindelemente
leaf = re.compile(r'<(?P<tag>[a-zA-Z][a-zA-Z0-9]*)(?P<attrs>(?:\s[^<>]*?)?)>(?P<txt>[^<>]*[A-Za-zÄÖÜäöü][^<>]*)</(?P=tag)>')
out = []; last = 0
for m in leaf.finditer(s):
    if skipped(m.start()) or m.group('tag').lower() in ('script', 'style', 'textarea', 'title'): continue
    if 'data-i18n' in m.group('attrs') or re.search(r'\sid=', m.group('attrs')): continue  # id = oft per JS umgeschrieben
    raw = m.group('txt'); text = html.unescape(raw).strip()
    if len(re.sub(r'[^A-Za-zÄÖÜäöüß]', '', text)) < 2: continue
    if '{{' in text or '${' in text or re.match(r'^[\d\W]', text) and len(text)<6: continue
    key = key_for(text, m.start())
    lead = re.match(r'\s*', raw).group(0); trail = re.search(r'\s*$', raw).group(0)
    out.append(s[last:m.start()])
    out.append('<%s%s data-i18n="%s">%s%s%s</%s>' % (m.group('tag'), m.group('attrs'), key, lead, raw.strip(), trail, m.group('tag')))
    last = m.end(); changed += 1
out.append(s[last:]); s = ''.join(out)

# 2) Attribute
for attr in ('placeholder', 'title', 'aria-label'):
    pat = re.compile(r'(<[a-zA-Z][^<>]*?)\s%s="([^"<>]*[A-Za-zÄÖÜäöü][^"<>]*)"([^<>]*>)' % attr)
    out = []; last = 0
    for m in pat.finditer(s):
        if skipped(m.start()) or ('data-i18n-%s' % attr) in m.group(0): continue
        text = html.unescape(m.group(2)).strip()
        if len(text) < 2 or '{{' in text: continue
        key = key_for(text, m.start())
        out.append(s[last:m.start()])
        out.append('%s %s="%s" data-i18n-%s="%s"%s' % (m.group(1), attr, m.group(2), attr, key, m.group(3)))
        last = m.end(); changed += 1
    out.append(s[last:]); s = ''.join(out)

open(SRC, 'w', encoding='utf8').write(s)
json.dump(de, open('lang/de.json', 'w', encoding='utf8'), ensure_ascii=False, indent=1, sort_keys=True)
print('geaendert:', changed, ' Schluessel gesamt:', len(de))
