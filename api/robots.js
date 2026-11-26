// /robots.txt – App bleibt gesperrt, nur die Übungsseiten sind für Suchmaschinen offen
const L = require('./_lib');

module.exports = (req, res) => {
  L.send(res, 200, 'text/plain; charset=utf-8',
    'User-agent: *\nAllow: /uebungen\nAllow: /fonts/\nAllow: /icons/\nDisallow: /\n\nSitemap: ' + L.baseUrl(req) + '/sitemap.xml\n',
    'public, s-maxage=86400');
};
