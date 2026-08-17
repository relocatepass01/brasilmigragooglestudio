// db.js - Inicialización unificada de Supabase (segura)
// Este archivo ya NO contiene claves embebidas en el repositorio.
// En entornos de despliegue (Vercel) genera un archivo `env.js` durante el build
// que expone únicamente las variables públicas necesarias en `window.__ENV`.
// Ejemplo (no subir valores reales):
// window.__ENV = { SUPABASE_URL: 'https://xxxxx.supabase.co', SUPABASE_KEY: 'sb_publishable_xxx' }

(function() {
    // Leer variables desde window.__ENV (establecido en tiempo de despliegue)
    const env = (window && window.__ENV) || {};
    const SUPABASE_URL = env.SUPABASE_URL || 'REPLACE_WITH_YOUR_SUPABASE_URL';
    const SUPABASE_KEY = env.SUPABASE_KEY || 'REPLACE_WITH_YOUR_PUBLISHABLE_KEY';

    function init() {
        if (window.supabase && typeof window.supabase.createClient === 'function') {
            try {
                window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
                console.log("✅ Conexión a Supabase inicializada (client)");
            } catch (e) {
                console.error('Error inicializando Supabase client:', e);
            }
        } else {
            console.warn('Supabase SDK no encontrado. Asegúrate de cargar https://cdn.jsdelivr.net/npm/@supabase/supabase-js');
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();

// Helper para acceso desde otras partes del frontend
function getSupabaseClientFromEnv() {
    if (window.supabaseClient) return window.supabaseClient;
    const env = (window && window.__ENV) || {};
    const SUPABASE_URL = env.SUPABASE_URL || 'REPLACE_WITH_YOUR_SUPABASE_URL';
    const SUPABASE_KEY = env.SUPABASE_KEY || 'REPLACE_WITH_YOUR_PUBLISHABLE_KEY';
    if (window.supabase && typeof window.supabase.createClient === 'function') {
        window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        return window.supabaseClient;
    }
    return null;
}
