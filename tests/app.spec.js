// Grundtests: Die wichtigsten Abläufe der App, ohne Internet und ohne Login.
// Alles Externe (Supabase, CDN, EmailJS) wird gesperrt, damit die Tests überall gleich laufen.
const { test, expect } = require('@playwright/test');

const TEST_EXERCISES = [
  { id: 't1', name: 'Testübung Pass', players: '6-12', material: 'Hütchen', section: 0, difficulty: 'Leicht', desc: 'Passen', tags: [], status: 'approved', sport: 'fussball', ageGroups: [] },
  { id: 't2', name: 'Testübung Schuss', players: '4-8', material: 'Tore', section: 1, difficulty: 'Mittel', desc: 'Schießen', tags: [], status: 'approved', sport: 'fussball', ageGroups: [] },
];

// Fehlermeldungen, die ohne Internet erwartet sind und den Test nicht stören sollen
const IGNORED_ERRORS = [/emailjs/i];

async function openApp(page, { onboarded = true, seed = true } = {}) {
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
