# Instrucciones de despliegue y configuración (RESUMEN RÁPIDO)

1) Rotar claves expuestas
- Supabase: Entra a https://app.supabase.com -> selecciona tu proyecto -> Settings -> API -> Regenera las claves si corresponde (service_role). Usa la publishable key en frontend solo si es necesaria.
- Stripe: Entra a https://dashboard.stripe.com/apikeys -> Regenera (Rotate) las claves si alguna fue expuesta. Mantén sk_ (secret) en Vercel env vars, pk_ en env.js si es necesario.

2) Variables en Vercel (Project -> Settings -> Environment Variables)
- SUPABASE_URL = https://<tu-proyecto>.supabase.co
- SUPABASE_KEY = <SUPABASE_PUBLIC_KEY>  # solo publishable si el cliente necesita
- STRIPE_PUBLIC_KEY = pk_live_... (o pk_test_...)  # público
- STRIPE_SECRET_KEY = sk_live_... (solo server)   # marcar como "Environment Variable (Only in Server)"

3) Build Command (Vercel) - generar env.js
- Si tu proyecto sirve archivos estáticos desde /public, añade el siguiente Build Command:

  echo "window.__ENV = { SUPABASE_URL: '$SUPABASE_URL', SUPABASE_KEY: '$SUPABASE_KEY', STRIPE_PUBLIC_KEY: '$STRIPE_PUBLIC_KEY' }" > ./public/env.js && npm run build

- Si no usas ./public, ajusta la ruta (./env.js o ./public/env.js) y asegúrate que tu HTML carga <script src="/env.js"></script> antes de los otros scripts.

4) Asegúrate de tener Dependabot activo (ya lo activaste)

5) Merge de cambios seguros
- Abre: https://github.com/relocatepass01/IA/compare/main...backend-seguro para revisar y crear el PR. Revisa los archivos y aprueba el merge.

6) Limpieza de historial (opcional, contactarme si quieres)

