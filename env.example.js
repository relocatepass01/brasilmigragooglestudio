// env.example.js
// NO SUBIR este archivo con valores reales. Ejemplo para generar durante el build un archivo env.js que exponga solo variables públicas necesarias al cliente.

window.__ENV = {
  SUPABASE_URL: "REPLACE_WITH_YOUR_SUPABASE_URL",
  SUPABASE_KEY: "REPLACE_WITH_YOUR_PUBLISHABLE_KEY",
  // STRIPE_PUBLIC_KEY: "pk_test_..." // sólo si tu frontend necesita el public key
};
