// db.js - Inicialización unificada de Supabase (modificado para no contener claves hardcodeadas)
(function() {
    const DEFAULT_SUPABASE_URL = 'https://wdhvycncwfydpgeqlvwb.supabase.co';
    const SUPABASE_URL = (window.RELOCATEPASS_CONFIG && window.RELOCATEPASS_CONFIG.SUPABASE_URL) || DEFAULT_SUPABASE_URL;
    const SUPABASE_KEY = (window.RELOCATEPASS_CONFIG && window.RELOCATEPASS_CONFIG.SUPABASE_KEY) || '';

    function init() {
        if (!SUPABASE_KEY) {
            console.warn('⚠️ Supabase key no proporcionada. Crea un archivo config.js desde config.example.js y establece window.RELOCATEPASS_CONFIG.SUPABASE_KEY si necesitas usar la clave en el cliente. NO comites secretos.');
        }
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
        const SUPABASE_URL = (window.RELOCATEPASS_CONFIG && window.RELOCATEPASS_CONFIG.SUPABASE_URL) || 'https://wdhvycncwfydpgeqlvwb.supabase.co';
        const SUPABASE_KEY = (window.RELOCATEPASS_CONFIG && window.RELOCATEPASS_CONFIG.SUPABASE_KEY) || '';
        window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    }
    return window.supabaseClient;
}
