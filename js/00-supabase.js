const SUPABASE_URL = 'https://vgfboblfpulgvqiotlog.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZnZmJvYmxmcHVsZ3ZxaW90bG9nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4NTU5NjcsImV4cCI6MjA5NzQzMTk2N30.MPukjA0GXbBH3KVfUCeD6wuK1MuDUjsJbeykfTc5Vyg';
// Muss mit der Adresse im <script>-Tag in index.html und in sw.js übereinstimmen
const SUPABASE_JS_URL = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.118.0';
let _supabase = null;
let currentUser = null;

// Lädt ein fremdes Skript nachträglich. Scheitert nach `timeout` ms, statt ewig zu warten.
function _loadScript(src, timeout = 10000) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src; s.async = true; s.crossOrigin = 'anonymous';
    const t = setTimeout(() => { s.remove(); reject(new Error('Zeitüberschreitung: ' + src)); }, timeout);
    s.onload = () => { clearTimeout(t); resolve(); };
    s.onerror = () => { clearTimeout(t); s.remove(); reject(new Error('Laden fehlgeschlagen: ' + src)); };
    document.head.appendChild(s);
  });
}

// Legt den Supabase-Client an, sobald die Bibliothek da ist. Gibt true zurück, wenn es einen Client gibt.
function _initSupabase() {
  if (_supabase) return true;
  try {
    if (window.supabase && window.supabase.createClient) {
      _supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

      // Password-Reset-Flow: Supabase setzt nach Klick auf Mail-Link eine Session
      // mit Event PASSWORD_RECOVERY — dann Passwort-setzen-Dialog zeigen
      _supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'PASSWORD_RECOVERY' && typeof showSetNewPasswordDialog === 'function') {
          showSetNewPasswordDialog();
        }
      });
    }
  } catch(e) {
    console.warn('Supabase konnte nicht initialisiert werden:', e);
    _supabase = null;
  }
  return !!_supabase;
}
_initSupabase();

// War das CDN beim Start blockiert oder das Gerät offline, wird die Bibliothek
// später (z. B. beim Wieder-online-Gehen) nachgeladen.
let _sbLoading = null;
function ensureSupabase() {
  if (_initSupabase()) return Promise.resolve(true);
  if (!_sbLoading) {
    _sbLoading = _loadScript(SUPABASE_JS_URL)
      .then(() => _initSupabase())
      .catch(e => { console.warn(e.message); return false; })
      .then(ok => { _sbLoading = null; return ok; });
  }
  return _sbLoading;
}

// Angemeldeter Nutzer aus dem lokalen Speicher, ohne Netz (für den Start im Offline-Modus)
async function _offlineSessionUser() {
  try {
    const { data } = await _supabase.auth.getSession();
    if (data && data.session && data.session.user) return data.session.user;
  } catch(e) {}
  try {
    const ref = new URL(SUPABASE_URL).hostname.split('.')[0];
    const raw = localStorage.getItem('sb-' + ref + '-auth-token');
    const s = raw ? JSON.parse(raw) : null;
    return (s && (s.user || (s.currentSession && s.currentSession.user))) || null;
  } catch(e) { return null; }
}
