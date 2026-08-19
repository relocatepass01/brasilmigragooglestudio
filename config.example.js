// config.example.js
// Copia este archivo a `config.js` en tu entorno local y completa los valores.
// NO comitees `config.js` en el repositorio. Este archivo es solo un ejemplo.

window.RELOCATEPASS_CONFIG = {
  // URL pública de Supabase (no es secreta)
  SUPABASE_URL: 'https://wdhvycncwfydpgeqlvwb.supabase.co',

  // Para uso en cliente (navegador) solo debe usarse la anon/public key.
  // Si necesitas claves de servicio (service_role) deben quedarse en el servidor y nunca en el cliente.
  SUPABASE_KEY: '', // ejemplo: sb_publishable_xxx (opcional para cliente)

  // Stripe: la clave pública puede vivir en el cliente; la secreta SOLO en servidor/Secrets.
  STRIPE_PUBLIC_KEY: ''
};
