const SUPABASE_URL = 'https://vgfboblfpulgvqiotlog.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZnZmJvYmxmcHVsZ3ZxaW90bG9nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4NTU5NjcsImV4cCI6MjA5NzQzMTk2N30.MPukjA0GXbBH3KVfUCeD6wuK1MuDUjsJbeykfTc5Vyg';
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
