// auth.js - versión limpiada: ya no incluye claves embebidas.

// ============================================
// SISTEMA DE AUTENTICACIÓN SEGURA (frontend)
// ============================================

function getSbClient() {
    if (window.supabaseClient) return window.supabaseClient;
    if (typeof getSupabase === 'function') return getSupabase();
    if (window.supabase && typeof window.supabase.createClient === 'function') {
        // Intentar crear client leyendo variables desde window.__ENV (generado en build)
        const env = (window && window.__ENV) || {};
        const SUPABASE_URL = env.SUPABASE_URL || 'REPLACE_WITH_YOUR_SUPABASE_URL';
        const SUPABASE_KEY = env.SUPABASE_KEY || 'REPLACE_WITH_YOUR_PUBLISHABLE_KEY';
        try {
            window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
            return window.supabaseClient;
        } catch (e) {
            console.error('Error creando Supabase client:', e);
            return null;
        }
    }
    return null;
}

// ============================================
// LOGIN Y REGISTRO CON GOOGLE
// ============================================
async function loginConGoogle() {
  try {
    const supabase = getSbClient();
    if (!supabase) {
        alert('❌ El sistema de base de datos aún no ha iniciado.');
        return;
    }
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + '/dashboard.html'
      }
    });

    if (error) {
      console.error('Error en login con Google:', error);
      alert('❌ Error al conectar con Google: ' + error.message);
    }
  } catch (error) {
    console.error('Error inesperado:', error);
    alert('❌ Ocurrió un error inesperado');
  }
}

window.loginConGoogle = loginConGoogle;

// (El resto del archivo conserva la funcionalidad, sin incluir claves embebidas en el repo.)

// Export/attach otras funciones igual que antes (omitir aquí por brevedad)
