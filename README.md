# SVW Trainingskatalog — Projektübersicht & Fahrplan

Dieses Dokument ist die Brücke zwischen der Aufräumarbeit hier (Claude.ai Chat)
und der Weiterentwicklung in **Claude Code** auf deinem eigenen Rechner.

---

## 1. Was wurde hier gemacht

Die ursprüngliche Datei `SVW_Trainingskatalog_ADMIN_13.html` (5184 Zeilen,
eine einzige Datei) wurde in folgende Struktur aufgeteilt:

```
svw-app/
├── index.html                      ← Grundgerüst, bindet alles andere ein
├── css/
│   └── styles.css                  ← komplettes Design (1075 Zeilen)
├── data/
│   └── exercises.default.js        ← 59 BEISPIEL-Übungen (siehe Abschnitt 2!)
└── js/
    ├── 01-i18n-theme.js            ← Sprachen (DE/EN/ES), Hell/Dunkel-Theme
    ├── 02-core-state.js            ← globaler State, API-Anbindung, Navigation
    ├── 03-submit-page.js           ← "Übung einreichen"-Seite, Admin-Freigabe
    ├── 04-planner.js                ← Trainingsplaner (Drag & Drop)
    ├── 05-catalog.js                ← Übungskatalog anzeigen/filtern/bearbeiten
    ├── 06-plan-save-load.js         ← Trainingspläne speichern/laden
    ├── 07-longterm-planning.js      ← Langzeit-Periodisierung (Wochen/Blöcke)
    ├── 08-modals-toast.js           ← Dialog- und Benachrichtigungs-Helfer
    ├── 09-default-descs.js          ← Platzhalter-Texte je Trainingsabschnitt
    ├── 10-field-editor.js           ← Canvas-Editor für Felddiagramme
    └── 11-app-start.js              ← startet die App (muss zuletzt geladen werden!)
```

**Wichtig:** Die Lade-Reihenfolge in `index.html` ist absichtlich so gewählt
(Daten → i18n/Theme → Core/State → Rest → App-Start), weil die Module
gemeinsamen globalen State nutzen. Wenn du später Dateien umbenennst oder
verschiebst, muss diese Reihenfolge erhalten bleiben.

Es wurde **nichts inhaltlich verändert** — jede Funktion aus der Originaldatei
ist 1:1 erhalten (207 Funktionen vorher = 207 Funktionen nachher, geprüft).

---

## 2. Die 59 Übungen in `data/exercises.default.js`

Das sind **Platzhalter/Beispiele**, keine fertigen Trainingsinhalte. Sie zeigen
nur das Datenformat. Bevor die App produktiv genutzt wird, solltet ihr im
Trainerteam diese Liste durchgehen und durch eigene, fachlich geprüfte
Übungen ersetzen.

Format einer Übung:
```js
{
  id: ...,            // eindeutige ID
  name: 'Übungsname',
  players: '6-12',    // Spieleranzahl als Text
  material: 'Hütchen, Bälle',  // Material als Text (Komma-getrennt)
  section: 0,          // Trainingsabschnitt (0-5)
  difficulty: 'Leicht', // Leicht | Mittel | Schwer
  desc: 'Beschreibung...',
  tags: ['TAG1','TAG2'],
  image: 'data:image/svg+xml;base64,...' // Felddiagramm
}
```

**Verbesserungsvorschlag fürs Datenmodell** (jetzt der richtige Zeitpunkt,
da die Übungen ohnehin überarbeitet werden): `material` als Liste statt
Freitext speichern, z.B. `material: [{item:'Hütchen', count:8}, ...]`. Das
macht spätere Auswertungen ("wer braucht Minitore?") und die Datenbank-
Modellierung sauberer. Das wäre in Claude Code mit dir zu klären.

---

## 3. Was als Nächstes in Claude Code passiert

Die hier aufgeräumte Version ist eine reine Frontend-App ohne echte
Mehrbenutzer-Datenbank — sie nutzt noch `localStorage` und eine optionale,
sehr einfache eigene API. Für euer Ziel (Login für ein Trainerteam, geteilter
Übungskatalog, private Trainingspläne, Potenzial für viele Nutzer) braucht es:

### Schritt 1: Lokale Entwicklungsumgebung einrichten
- VS Code installieren
- Git installieren, GitHub-Konto anlegen
- Dieses Projekt in ein GitHub-Repository bringen

### Schritt 2: Supabase-Projekt anlegen (kostenlos)
- Konto unter supabase.com
- Neues Projekt erstellen → liefert Datenbank + Login-System + API

### Schritt 3: Datenbank-Schema entwerfen
Vorschlag für die Tabellenstruktur (final mit Claude Code zu verfeinern):

```
trainers (verwaltet automatisch von Supabase Auth)
  id, email, name, created_at

exercises                         ← GEMEINSAMER Katalog, alle Trainer sehen alle
  id, name, players, material, section, difficulty, desc, tags,
  image, created_by (→ trainers.id), status ('approved'|'pending'),
  created_at

plans                             ← PRIVAT, nur eigener Trainer sieht eigene
  id, owner_id (→ trainers.id), name, lanes (JSON), created_at

ltp_blocks                        ← PRIVAT, Langzeitplanung
  id, owner_id (→ trainers.id), name, weeks (JSON), created_at
```

Die Trennung "gemeinsam" vs. "privat" wird über **Row Level Security (RLS)**
in Supabase erzwungen — nicht nur im Frontend-Code geprüft. Das ist wichtig
für echte Sicherheit, sobald mehr als eine Handvoll Trainer das nutzen.

### Schritt 4: Login einbauen
- Supabase Auth ersetzt den aktuellen Demo-Login in `03-submit-page.js`
- E-Mail/Passwort oder Magic-Link, je nach Wunsch

### Schritt 5: Frontend an Supabase anbinden
- `02-core-state.js` (loadAPI/saveAPI) wird umgebaut: statt eigener API/
  localStorage werden die Supabase-JS-Bibliothek und ihre Funktionen genutzt

### Schritt 6: Hosting
- Vercel oder Netlify, verbunden mit dem GitHub-Repository
- Jeder `git push` aktualisiert die Live-Seite automatisch

---

## 4. Offene fachliche Aufgaben (nicht technisch, sondern inhaltlich)

- [ ] Alle 59 Beispiel-Übungen durchgehen, überarbeiten oder ersetzen
- [ ] Entscheiden: bleibt `material` als Freitext oder wird es strukturiert?
- [ ] Trainingsabschnitte (`SECS` in `02-core-state.js`) prüfen — passen die
      6 Abschnitte zu eurem tatsächlichen Trainingsaufbau?
- [ ] Vorlagen in `04-planner.js` (`loadTemplate`) ggf. anpassen/ergänzen

---

## 5. Wie es weitergeht

Öffne den Ordner `svw-app/` in VS Code (über Claude Code), und sag Claude Code,
dass du mit Schritt 1 (Git/GitHub-Setup) anfangen möchtest. Claude Code kann
dich live durch Installation, Konten-Setup und jeden weiteren Schritt führen,
inklusive Testen und Fehlerbehebung in Echtzeit — das kann dieser Chat hier
nicht leisten.
