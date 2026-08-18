// db.js - Inicialización unificada de Supabase
// IMPORTANTE: Las credenciales se cargan desde variables de entorno

(function() {
    // Obtener credenciales de variables de entorno
    const SUPABASE_URL = window.CONFIG?.SUPABASE_URL || import.meta?.env?.VITE_SUPABASE_URL;
    const SUPABASE_KEY = window.CONFIG?.SUPABASE_KEY || import.meta?.env?.VITE_SUPABASE_KEY;

    if (!SUPABASE_URL || !SUPABASE_KEY) {
        console.error('❌ Error: Variables de Supabase no configuradas. Verifica tu archivo .env');
        return;
    }

    function init() {
        if (window.supabase && typeof window.supabase.createClient === 'function') {
            window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
            console.log("✅ Conexión a Supabase inicializada");
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();

function getSupabase() {
    if (!window.supabaseClient && window.supabase && typeof window.supabase.createClient === 'function') {
        const SUPABASE_URL = window.CONFIG?.SUPABASE_URL || import.meta?.env?.VITE_SUPABASE_URL;
        const SUPABASE_KEY = window.CONFIG?.SUPABASE_KEY || import.meta?.env?.VITE_SUPABASE_KEY;
        
        if (SUPABASE_URL && SUPABASE_KEY) {
            window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        }
    }
    return window.supabaseClient;
}
