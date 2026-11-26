// Übersichtsseite: /uebungen
const L = require('./_lib');

module.exports = async (req, res) => {
  try {
    const list = await L.loadExercises();
    const base = L.baseUrl(req);
    let body = '<h1>Trainingsübungen für Fußball, Volleyball und Tennis</h1><p>Kostenlose Übungen mit Beschreibung, Material und Altersstufe – direkt in die Trainingsplanung übernehmen.</p>';
    for (const [id, label] of Object.entries(L.SPORTS)) {
      const items = list.filter(e => (e.sport || 'fussball') === id);
      if (!items.length) continue;
      body += `<h2>${L.SPORT_BALL[id]} ${L.esc(label)}</h2><ul class="list">` + items.map(e => {
        const meta = [L.SECTIONS[e.section], Array.isArray(e.age_groups) ? e.age_groups.join(', ') : '', e.duration ? e.duration + ' Min.' : ''].filter(Boolean).join(' · ');
        return `<li><a href="/uebungen/${L.slugFor(e)}"><strong>${L.esc(e.name)}</strong><span>${L.esc(meta)}</span></a></li>`;
      }).join('') + '</ul>';
    }
    L.send(res, 200, 'text/html; charset=utf-8', L.layout({
      title: 'Trainingsübungen für Fußball, Volleyball und Tennis | AssistCoach',
      description: 'Übungssammlung für Trainer: Fußball-, Volleyball- und Tennisübungen mit Beschreibung, Material und Altersstufe.',
      canonical: base + '/uebungen', body }));
  } catch (e) {
    L.send(res, 502, 'text/plain; charset=utf-8', 'Übungen konnten gerade nicht geladen werden.', 'no-store');
  }
};
