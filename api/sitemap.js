// /sitemap.xml – alle freigegebenen Übungen
const L = require('./_lib');

module.exports = async (req, res) => {
  try {
    const list = await L.loadExercises();
    const base = L.baseUrl(req);
    const urls = [base + '/uebungen', ...list.map(e => base + '/uebungen/' + L.slugFor(e))];
    L.send(res, 200, 'application/xml; charset=utf-8',
      '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
      urls.map(u => `  <url><loc>${L.esc(u)}</loc></url>`).join('\n') + '\n</urlset>\n');
  } catch (e) {
    L.send(res, 502, 'text/plain; charset=utf-8', 'Sitemap konnte gerade nicht erzeugt werden.', 'no-store');
  }
};
