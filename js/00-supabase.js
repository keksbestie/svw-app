const SUPABASE_URL = 'https://vgfboblfpulgvqiotlog.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_lguxIAD-SsQB8h9PTbe6VA_k_gphGJf';
let _supabase = null;
let currentUser = null;

try {
  if (window.supabase && window.supabase.createClient) {
    _supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Password-Reset-Flow: Supabase setzt nach Klick auf Mail-Link eine Session
    // mit Event PASSWORD_RECOVERY — dann Passwort-setzen-Dialog zeigen
    _supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        showSetNewPasswordDialog();
      }
    });
  }
} catch(e) {
  console.warn('Supabase konnte nicht initialisiert werden:', e);
}
