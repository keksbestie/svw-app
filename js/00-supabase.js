const SUPABASE_URL = 'https://vgfboblfpulgvqiotlog.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_lguxIAD-SsQB8h9PTbe6VA_k_gphGJf';
const _supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
let currentUser = null;
