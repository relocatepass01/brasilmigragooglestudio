// auth.js - usa la configuración desde window.RELOCATEPASS_CONFIG (sin claves hardcodeadas)

function getSbClient() {
    if (window.supabaseClient) return window.supabaseClient;
    if (typeof getSupabase === 'function') return getSupabase();
    if (window.supabase && typeof window.supabase.createClient === 'function') {
        const SUPABASE_URL = (window.RELOCATEPASS_CONFIG && window.RELOCATEPASS_CONFIG.SUPABASE_URL) || 'https://wdhvycncwfydpgeqlvwb.supabase.co';
        const SUPABASE_KEY = (window.RELOCATEPASS_CONFIG && window.RELOCATEPASS_CONFIG.SUPABASE_KEY) || '';
        if (!SUPABASE_KEY) {
            console.warn('⚠️ Supabase key no proporcionada en config. Si necesitas autenticación cliente, establece window.RELOCATEPASS_CONFIG.SUPABASE_KEY en config.js local (NO lo comites).');
        }
        window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        return window.supabaseClient;
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
    
    // Comando oficial de Supabase para OAuth con Google
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        // Redirige al usuario directamente al panel privado tras autenticarse/registrarse
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

// Exporta funciones globales
window.loginConGoogle = loginConGoogle;
window.loginConApple = window.loginConApple || function(){};
window.registroUsuario = window.registroUsuario || function(){};
window.loginUsuario = window.loginUsuario || function(){};
window.logoutUsuario = window.logoutUsuario || function(){};
