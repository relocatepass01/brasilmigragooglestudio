// ============================================
// CONFIGURACIÓN CENTRALIZADA - USAR VARIABLES DE ENTORNO
// ============================================

// Stripe
const STRIPE_PUBLIC_KEY = import.meta?.env?.VITE_STRIPE_PUBLIC_KEY || window.__CONFIG__?.STRIPE_PUBLIC_KEY || 'pk_test_';

// Supabase
const SUPABASE_URL = import.meta?.env?.VITE_SUPABASE_URL || window.__CONFIG__?.SUPABASE_URL || '';
const SUPABASE_KEY = import.meta?.env?.VITE_SUPABASE_KEY || window.__CONFIG__?.SUPABASE_KEY || '';

// Admin
const ADMIN_PIN = import.meta?.env?.VITE_ADMIN_PIN || window.__CONFIG__?.ADMIN_PIN || '';

// Validar que las variables están configuradas
if (!STRIPE_PUBLIC_KEY || STRIPE_PUBLIC_KEY.startsWith('pk_test_')) {
    console.warn('⚠️ VITE_STRIPE_PUBLIC_KEY no está configurado correctamente');
}

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.warn('⚠️ Variables de Supabase no están configuradas correctamente');
}

window.CONFIG = {
    STRIPE_PUBLIC_KEY,
    SUPABASE_URL,
    SUPABASE_KEY,
    ADMIN_PIN
};

export { STRIPE_PUBLIC_KEY, SUPABASE_URL, SUPABASE_KEY, ADMIN_PIN };
