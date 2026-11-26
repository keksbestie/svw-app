// Einzelne Übungsseite: /uebungen/<name-id>
const L = require('./_lib');

module.exports = async (req, res) => {
  try {
    const slug = String((req.query && req.query.slug) || '').toLowerCase();
    const list = await L.loadExercises();
    const ex = list.find(e => L.slugFor(e) === slug);
    if (!ex) return L.send(res, 404, 'text/html; charset=utf-8',
      L.layout({ title: 'Übung nicht gefunden – AssistCoach', description: 'Diese Übung gibt es nicht.', canonical: L.baseUrl(req) + '/uebungen',
        body: '<h1>Übung nicht gefunden</h1><p><a href="/uebungen">Zu allen Übungen</a></p>' }).replace('index, follow', 'noindex'),
      'public, s-maxage=60');

    const base = L.baseUrl(req);
    const url = base + '/uebungen/' + L.slugFor(ex);
    const sport = L.SPORTS[ex.sport || 'fussball'] || 'Training';
    const section = L.SECTIONS[ex.section] || '';
    const ages = Array.isArray(ex.age_groups) ? ex.age_groups.filter(Boolean) : [];
    const tags = Array.isArray(ex.tags) ? ex.tags.filter(Boolean) : [];
    const text = String(ex.description || '').trim();
    const short = (text.replace(/\s+/g, ' ').slice(0, 150) || (sport + '-Übung')).trim();
    const title = ex.name + ' – ' + sport + '-Übung' + (ages.length ? ' (' + ages.join(', ') + ')' : '') + ' | AssistCoach';
    const description = ex.name + ': ' + short + (text.length > 150 ? '…' : '');
    const img = L.imageUrl(ex);

    const chips = [section, ex.difficulty, ex.duration ? ex.duration + ' Min.' : '', ex.players ? ex.players + ' Spieler' : '', ages.join(', ')]
      .filter(Boolean).map(c => `<span class="chip">${L.esc(c)}</span>`).join('');
    const facts = [['Sportart', sport], ['Trainingsteil', section], ['Spieler', ex.players], ['Dauer', ex.duration ? ex.duration + ' Minuten' : ''],
      ['Material', ex.material], ['Altersstufe', ages.join(', ')], ['Intensität', ex.difficulty]]
      .filter(r => r[1]).map(r => `<dt>${L.esc(r[0])}</dt><dd>${L.esc(r[1])}</dd>`).join('');

    const body = `<p class="crumbs"><a href="/uebungen">Übungen</a> › ${L.esc(sport)}</p>
<h1>${L.esc(ex.name)}</h1><div class="chips">${chips}</div>
<div class="card">${img ? `<img src="${L.esc(img)}" alt="${L.esc(ex.name)} – Aufbau der Übung" loading="lazy">` : ''}
<h2>Beschreibung</h2><div class="desc">${L.esc(text || 'Keine Beschreibung vorhanden.')}</div></div>
${facts ? `<div class="card"><h2>Auf einen Blick</h2><dl>${facts}</dl></div>` : ''}
${tags.length ? `<div class="chips">${tags.map(t => `<span class="chip">${L.esc(t)}</span>`).join('')}</div>` : ''}
<div class="cta"><strong>Diese Übung in dein Training übernehmen</strong><p>Plane ganze Trainingseinheiten per Drag &amp; Drop mit AssistCoach.</p>
<a class="btn dark" href="/">In der App öffnen</a></div>
<p><a href="/uebungen">← Alle Übungen</a></p>`;

    const jsonld = { '@context': 'https://schema.org', '@type': 'HowTo', name: ex.name, description: text || description,
      ...(img ? { image: img } : {}), ...(ex.duration ? { totalTime: 'PT' + parseInt(ex.duration, 10) + 'M' } : {}),
      ...(ex.material ? { supply: String(ex.material).split(',').map(m => m.trim()).filter(Boolean).map(m => ({ '@type': 'HowToSupply', name: m })) } : {}),
      step: [{ '@type': 'HowToStep', text: text || ex.name }], keywords: tags.join(', ') || undefined };

    L.send(res, 200, 'text/html; charset=utf-8', L.layout({ title, description, canonical: url, image: img, body, jsonld }));
  } catch (e) {
    L.send(res, 502, 'text/plain; charset=utf-8', 'Übung konnte gerade nicht geladen werden.', 'no-store');
  }
};
