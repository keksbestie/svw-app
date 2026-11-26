// Gemeinsame Helfer für die öffentlichen Übungsseiten (/uebungen/...).
// Es werden nur freigegebene Übungen geladen und NIE Angaben zum Ersteller.
const SUPABASE_URL = 'https://vgfboblfpulgvqiotlog.supabase.co';
// Der anon-Key ist öffentlich (steht auch in js/00-supabase.js); Zugriff regelt Supabase per RLS.
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZnZmJvYmxmcHVsZ3ZxaW90bG9nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4NTU5NjcsImV4cCI6MjA5NzQzMTk2N30.MPukjA0GXbBH3KVfUCeD6wuK1MuDUjsJbeykfTc5Vyg';

const SECTIONS = ['Open Field', 'Warm Up', 'Hinführung', 'Hauptteil', 'Abschlussspiel', 'Sondertraining'];
const SPORTS = { fussball: 'Fußball', volleyball: 'Volleyball', tennis: 'Tennis' };
const SPORT_BALL = { fussball: '⚽', volleyball: '🏐', tennis: '🎾' };
// Bewusst ohne created_by und canvas_objects: der Ersteller darf nirgends auftauchen.
const COLUMNS = 'id,name,players,material,section,difficulty,description,tags,image,duration,sport,age_groups';

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function slugify(s) {
  return String(s || 'uebung').toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'uebung';
}

// Adresse: name-kurzeid, damit gleiche Namen nie kollidieren
function slugFor(ex) {
  return slugify(ex.name) + '-' + String(ex.id).replace(/[^a-z0-9]/gi, '').toLowerCase().slice(0, 8);
}

async function loadExercises() {
  const url = SUPABASE_URL + '/rest/v1/exercises?select=' + COLUMNS + '&status=eq.approved&order=name.asc';
  const r = await fetch(url, { headers: { apikey: SUPABASE_ANON_KEY, Authorization: 'Bearer ' + SUPABASE_ANON_KEY } });
  if (!r.ok) throw new Error('Supabase ' + r.status);
  return (await r.json()).filter(e => e && e.name);
}

function baseUrl(req) {
  const host = (req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0];
  const proto = (req.headers['x-forwarded-proto'] || 'https').split(',')[0];
  return proto + '://' + host;
}

function imageUrl(ex) {
  const i = ex.image;
  return typeof i === 'string' && /^https:\/\//.test(i) ? i : '';
}

const CSS = `
*{box-sizing:border-box}body{margin:0;font-family:'Barlow',system-ui,sans-serif;background:#f4f6f5;color:#1c2421;line-height:1.55}
header{background:#1a7f4b;color:#fff;padding:14px 20px;display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap}
header a{color:#fff;text-decoration:none}.brand{font-family:'Barlow Condensed',sans-serif;font-weight:900;font-size:22px;letter-spacing:.5px}
.btn{display:inline-block;background:#fff;color:#135f38;font-weight:700;padding:8px 16px;border-radius:9px;text-decoration:none}
.btn.dark{background:#1a7f4b;color:#fff}
main{max-width:820px;margin:0 auto;padding:22px 16px 48px}
h1{font-family:'Barlow Condensed',sans-serif;font-weight:900;font-size:36px;line-height:1.1;margin:6px 0 12px}
.crumbs{font-size:13px;color:#5a6a63}.crumbs a{color:#1a7f4b}
.chips{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0 18px}
.chip{background:#e8f5ee;color:#135f38;border-radius:8px;padding:5px 11px;font-size:14px;font-weight:600}
.card{background:#fff;border-radius:14px;padding:20px;box-shadow:0 1px 4px rgba(0,0,0,.07);margin-bottom:16px}
.card img{width:100%;height:auto;border-radius:10px;display:block;margin-bottom:14px}
.desc{white-space:pre-line}
dl{display:grid;grid-template-columns:max-content 1fr;gap:6px 16px;margin:0}dt{font-weight:700}dd{margin:0}
.cta{background:#e8f5ee;border-radius:14px;padding:20px;text-align:center}
ul.list{list-style:none;padding:0;margin:0;display:grid;gap:12px}
ul.list li a{display:block;background:#fff;border-radius:12px;padding:14px 16px;text-decoration:none;color:inherit;box-shadow:0 1px 4px rgba(0,0,0,.07)}
ul.list li a:hover{box-shadow:0 2px 8px rgba(0,0,0,.15)}ul.list strong{font-size:18px;color:#135f38}
ul.list span{display:block;font-size:14px;color:#5a6a63}
footer{text-align:center;font-size:13px;color:#5a6a63;padding:0 16px 30px}footer a{color:#1a7f4b}`;

function layout({ title, description, canonical, image, body, jsonld }) {
  return `<!DOCTYPE html>
<html lang="de"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${esc(canonical)}">
<meta name="robots" content="index, follow">
<meta property="og:type" content="article"><meta property="og:locale" content="de_DE">
<meta property="og:site_name" content="AssistCoach"><meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}"><meta property="og:url" content="${esc(canonical)}">
${image ? `<meta property="og:image" content="${esc(image)}">` : ''}
<meta name="theme-color" content="#1a7f4b">
<link rel="icon" href="/icons/icon-192.png">
<link rel="stylesheet" href="/fonts/fonts.css">
<style>${CSS}</style>
${jsonld ? `<script type="application/ld+json">${JSON.stringify(jsonld).replace(/</g, '\\u003c')}</script>` : ''}
</head><body>
<header><a class="brand" href="/uebungen">AssistCoach</a><a class="btn" href="/">App öffnen</a></header>
<main>${body}</main>
<footer>AssistCoach – Trainingsplaner für Trainerinnen und Trainer</footer>
</body></html>`;
}

function send(res, status, type, body, cache) {
  res.statusCode = status;
  res.setHeader('Content-Type', type);
  // Vercel hält die Seite 1 Stunde im Cache; danach wird sie im Hintergrund erneuert.
  res.setHeader('Cache-Control', cache || 'public, s-maxage=3600, stale-while-revalidate=86400');
  res.end(body);
}

module.exports = { SECTIONS, SPORTS, SPORT_BALL, esc, slugFor, slugify, loadExercises, baseUrl, imageUrl, layout, send };
