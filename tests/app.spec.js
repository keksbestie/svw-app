// Grundtests: Die wichtigsten Abläufe der App, ohne Internet und ohne Login.
// Alles Externe (Supabase, CDN, EmailJS) wird gesperrt, damit die Tests überall gleich laufen.
const { test, expect } = require('@playwright/test');

const TEST_EXERCISES = [
  { id: 't1', name: 'Testübung Pass', players: '6-12', material: 'Hütchen', section: 0, difficulty: 'Leicht', desc: 'Passen', tags: [], status: 'approved', sport: 'fussball', ageGroups: [] },
  { id: 't2', name: 'Testübung Schuss', players: '4-8', material: 'Tore', section: 1, difficulty: 'Mittel', desc: 'Schießen', tags: [], status: 'approved', sport: 'fussball', ageGroups: [] },
];

// Fehlermeldungen, die ohne Internet erwartet sind und den Test nicht stören sollen
const IGNORED_ERRORS = [/emailjs/i, /reading 'from'/]; // 2. Eintrag: Supabase fehlt offline, Kader/Kalender fragen es mit dem Test-Konto ab

async function openApp(page, { onboarded = true, seed = true, guest = false } = {}) {
  await page.route(/^(?!http:\/\/localhost).*/, r => r.abort());
  const errors = [];
  page.on('pageerror', e => { if (!IGNORED_ERRORS.some(re => re.test(e.message))) errors.push(e.message); });
  await page.addInitScript(({ onboarded, seed, ex }) => {
    if (onboarded) localStorage.setItem('ac_onboarded', '1');
    if (seed && !localStorage.getItem('tb_12')) {
      localStorage.setItem('tb_12', JSON.stringify({ exercises: ex, savedPlans: [], ltpBlocks: [], blockLibrary: [] }));
    }
  }, { onboarded, seed, ex: TEST_EXERCISES });
  await page.goto('/');
  await page.waitForFunction(() => typeof goPage === 'function' && document.getElementById('ls').style.display === 'none');
  // Ohne Gast-Modus tut der Test so, als wäre ein Konto angemeldet (Gäste dürfen nur den Katalog sehen)
  await page.waitForFunction(() => _authPending === false);
  if (!guest) await page.evaluate(() => { currentUser = { id: 'test-user' }; renderStbar(); renderSection(); });
  return errors;
}

// Aktuelle Seite: auf der Startseite „page-home“, sonst die Seite mit der Klasse „active“
const currentPage = page => page.evaluate(() =>
  document.body.classList.contains('on-home')
    ? 'page-home'
    : Array.from(document.querySelectorAll('.page.active')).find(e => e.id !== 'page-home')?.id);

test('App startet ohne JavaScript-Fehler und zeigt die Startseite', async ({ page }) => {
  const errors = await openApp(page);
  expect(await currentPage(page)).toBe('page-home');
  expect(errors).toEqual([]);
});

test('Alle Hauptseiten lassen sich öffnen', async ({ page }) => {
  const errors = await openApp(page);
  for (const name of ['planner', 'longterm', 'calendar', 'handbook', 'submit', 'settings', 'kader', 'home']) {
    await page.evaluate(n => goPage(n), name);
    expect(await currentPage(page), 'Seite ' + name).toBe(name === 'home' ? 'page-home' : 'page-' + name);
  }
  expect(errors).toEqual([]);
});

test('Onboarding: erscheint beim ersten Start und lässt sich durchklicken', async ({ page }) => {
  const errors = await openApp(page, { onboarded: false });
  const overlay = page.locator('#onboardingOverlay');
  await expect(overlay).toBeVisible();
  const next = page.locator('#obNextBtn');
  await expect(next).toHaveText(/Weiter/);
  // bis zur letzten Folie klicken
  for (let i = 0; i < 20 && !/Loslegen/.test(await next.textContent()); i++) await next.click();
  await expect(next).toHaveText(/Loslegen/);
  await next.click();
  await expect(overlay).toBeHidden();
  expect(await page.evaluate(() => localStorage.getItem('ac_onboarded'))).toBe('1');
  expect(errors).toEqual([]);
});

test('Onboarding: erscheint nicht erneut, wenn schon gesehen', async ({ page }) => {
  await openApp(page, { onboarded: true });
  await expect(page.locator('#onboardingOverlay')).toBeHidden();
});

test('Hilfecenter: öffnet und wechselt den Reiter', async ({ page }) => {
  const errors = await openApp(page);
  await page.evaluate(() => openHelpPanel());
  await expect(page.locator('#helpPanel')).toBeVisible();
  await page.evaluate(() => switchHelpTab('detail'));
  await expect(page.locator('#helpTabDetail')).toBeVisible();
  await expect(page.locator('#helpTabQuick')).toBeHidden();
  expect(errors).toEqual([]);
});

test('Planer: Übung zum Plan hinzufügen, doppelt nicht, Plan leeren', async ({ page }) => {
  const errors = await openApp(page);
  await page.evaluate(() => goPage('planner'));
  await expect(page.getByText('Testübung Pass').first()).toBeAttached(); // Übung steht im Katalog

  const count = () => page.evaluate(() => currentPlan.lanes.reduce((a, l) => a + l.length, 0));
  expect(await count()).toBe(0);
  await page.evaluate(() => addToPlan('t1', 0));
  expect(await count()).toBe(1);
  await page.evaluate(() => addToPlan('t1', 0)); // doppelt
  expect(await count()).toBe(1);
  await page.evaluate(() => addToPlan('t2', 1));
  expect(await count()).toBe(2);

  await page.evaluate(() => { window.confirm = () => true; clearPlan(); });
  expect(await count()).toBe(0);
  expect(errors).toEqual([]);
});

test('Planer: Speichern ohne Login speichert nichts', async ({ page }) => {
  const errors = await openApp(page);
  await page.evaluate(() => goPage('planner'));
  await page.evaluate(() => addToPlan('t1', 0));
  await page.evaluate(() => { currentUser = null; });
  await page.evaluate(() => savePlan());
  expect(await page.evaluate(() => savedPlans.length)).toBe(0); // nicht angemeldet → nichts gespeichert
  expect(errors).toEqual([]);
});

test('Langzeitplanung: Seite lädt und rendert ohne Fehler', async ({ page }) => {
  const errors = await openApp(page);
  await page.evaluate(() => goPage('longterm'));
  await expect(page.locator('#page-longterm')).toBeVisible();
  await page.evaluate(() => renderLtp());
  expect(errors).toEqual([]);
});

test('Gespeicherte Daten bleiben nach Neuladen erhalten', async ({ page }) => {
  const errors = await openApp(page);
  expect(await page.evaluate(() => exercises.length)).toBe(2);
  await page.reload();
  await page.waitForFunction(() => typeof goPage === 'function' && document.getElementById('ls').style.display === 'none');
  expect(await page.evaluate(() => exercises.map(e => e.name))).toEqual(['Testübung Pass', 'Testübung Schuss']);
  expect(errors).toEqual([]);
});

test('Gast: nur 3 Übungen pro Abschnitt, Planer und Sondertraining gesperrt', async ({ page }) => {
  const errors = await openApp(page, { guest: true });
  const r = await page.evaluate(() => {
    exercises = [];
    for (let s = 0; s < 6; s++) for (let i = 0; i < 5; i++) exercises.push({ id: 'g' + s + i, name: 'G' + s + i, section: s, status: 'approved', sport: 'fussball', tags: [] });
    renderStbar(); goPage('handbook'); renderSection();
    const guestTotal = sportExercises().length;
    const tabs = document.querySelectorAll('.st').length;
    const locked = document.querySelectorAll('.card-locked').length;
    goPage('planner');
    const prompt = !!document.getElementById('loginRequiredModal');
    return { guestTotal, tabs, locked, prompt, onPlanner: document.getElementById('page-planner').classList.contains('active') };
  });
  expect(r).toEqual({ guestTotal: 15, tabs: 5, locked: 2, prompt: true, onPlanner: false });
  expect(errors).toEqual([]);
});

// ── Vereinsfarbe: Palette, Kontrast, Anwenden ──
test('Vereinsfarben: Kontrast im hellen und dunklen Design reicht für Text', async ({ page }) => {
  await openApp(page);
  const res = await page.evaluate(() => {
    const lum = h => { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255].map(v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }).reduce((a, v, i) => a + v * [.2126, .7152, .0722][i], 0); };
    const cr = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
    return CLUB_COLORS.filter(c => c.id !== 'gruen').map(c => ({
      id: c.id,
      whiteOnLight: cr('#ffffff', c.light), lightOnBg: cr(c.light, '#f6f7f6'), lightOnMix: cr(c.light, '#f5f7f7'), lightOnMix2: cr(c.light, '#eef2f1'),
      darkOnSurface: cr(c.dark, '#1c221c'), darkOnBg: cr(c.dark, '#111612'), darkOnNight: cr(c.dark, '#050d12'), darkOnMixSurface: cr(c.dark, '#0e161c'), darkOnMixSurface2: cr(c.dark, '#1a2831'), darkOnMixBg: cr(c.dark, '#05090d'),
      textOnDark: cr(CLUB_COLOR_ON_DARK, c.dark),
    }));
  });
  expect(res.length).toBeGreaterThanOrEqual(8);
  for (const r of res) for (const [k, v] of Object.entries(r)) if (k !== 'id') expect(v, `${r.id} ${k}`).toBeGreaterThanOrEqual(4.5);
});

test('Vereinsfarbe wird gesetzt, wieder entfernt und Unbekanntes bleibt Standard', async ({ page }) => {
  const errors = await openApp(page);
  const get = () => page.evaluate(() => ({ accent: getComputedStyle(document.documentElement).getPropertyValue('--accent').trim(), on: getComputedStyle(document.documentElement).getPropertyValue('--accent-on').trim(), attr: document.documentElement.getAttribute('data-club-color') }));
  expect((await get()).accent).toMatch(/^#(2fd08f|0f8a5a|1a7f4b)$/); // Standard-Grün im jeweiligen Design
  await page.evaluate(() => { applyTheme('light'); applyClubColor('rot'); });
  expect(await get()).toMatchObject({ accent: '#c62828', on: '#ffffff', attr: 'rot' });
  await page.evaluate(() => applyTheme('dark'));
  expect(await get()).toMatchObject({ accent: '#ff6b6b', on: '#0b0f0c' });
  await page.evaluate(() => { applyTheme('dark'); applyClubColor('schwarz'); });
  expect((await get()).accent).toBe('#e5e7eb'); // Schwarz: im dunklen Design helle Variante
  await page.evaluate(() => applyClubColor('gibtsnicht'));
  expect(await get()).toMatchObject({ attr: null });
  expect((await get()).accent).toBe('#2fd08f');
  expect(errors).toEqual([]);
});

test('Vereins-Schwerpunkte erscheinen im Planer und sind gegen HTML geschützt', async ({ page }) => {
  const errors = await openApp(page);
  await page.evaluate(() => { currentClub = { id: 'c1', name: 'Test', focus_points: [{ title: 'Defensivverhalten', text: 'Kompakt <b>stehen</b>' }, { title: '' }] }; renderClubFocusPlanner(); goPage('planner'); });
  const card = page.locator('#clubFocusPlanner');
  await expect(card).toBeVisible();
  await expect(card).toContainText('Defensivverhalten');
  await expect(card).toContainText('<b>stehen</b>'); // als Text, nicht als HTML
  await page.evaluate(() => { currentClub = null; renderClubFocusPlanner(); });
  await expect(card).toBeHidden();
  expect(errors).toEqual([]);
});

test('Vereinsfarbe: Trainingsplan-Knopf in der Kopfzeile hat die Akzentfarbe als Schrift (alle Farben, hell und dunkel)', async ({ page }) => {
  const errors = await openApp(page);
  await page.evaluate(() => goPage('planner'));
  await page.addStyleTag({ content: '*{transition:none!important}' }); // sonst liest der Test Zwischenfarben
  const toRgb = h => { const n = parseInt(h.slice(1), 16); return `rgb(${n >> 16}, ${(n >> 8) & 255}, ${n & 255})`; };
  const ids = await page.evaluate(() => CLUB_COLORS.filter(c => c.id !== 'gruen').map(c => ({ id: c.id, light: c.light, dark: c.dark })));
  for (const theme of ['dark', 'light']) for (const c of ids) {
    await page.evaluate(([t, id]) => { applyTheme(t); applyClubColor(id, false); }, [theme, c.id]);
    const col = await page.evaluate(() => getComputedStyle(document.getElementById('hcnt')).color);
    expect(col, `${c.id} ${theme}`).toBe(toRgb(theme === 'dark' ? c.dark : c.light));
  }
  expect(errors).toEqual([]);
});

test('Angebote: Vereins-Karte nennt die eigene Vereinsfarbe', async ({ page }) => {
  const errors = await openApp(page);
  await page.evaluate(() => goPage('angebote'));
  await expect(page.locator('.offer-card--club')).toContainText('Vereinsfarbe');
  await expect(page.locator('.offer-card--club')).toContainText('Spielphilosophie');
  expect(errors).toEqual([]);
});
