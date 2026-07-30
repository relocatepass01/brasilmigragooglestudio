// db.js - Inicialización unificada de Supabase
(function() {
    const SUPABASE_URL = 'https://wdhvycncwfydpgeqlvwb.supabase.co';
    const SUPABASE_KEY = 'sb_publishable_o4qKEJ1v7VgVpEGq1F2AAg_o7RvIrK5';

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
        const SUPABASE_URL = 'https://wdhvycncwfydpgeqlvwb.supabase.co';
        const SUPABASE_KEY = 'sb_publishable_o4qKEJ1v7VgVpEGq1F2AAg_o7RvIrK5';
        window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    }
    return window.supabaseClient;
}
