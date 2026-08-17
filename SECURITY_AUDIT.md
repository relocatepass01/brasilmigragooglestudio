# SECURITY AUDIT & ACTIONS

He hecho los cambios mínimos necesarios para retirar secretos embebidos del código cliente y dejar instrucciones para desplegar de forma segura en Vercel.

Qué cambié en esta rama (backend-seguro):

- db.js: eliminado el valor en texto de la clave y URL de Supabase; ahora lee desde window.__ENV. (archivo reemplazado)
- auth.js: eliminado fallback con claves embebidas (archivo reemplazado)
- admin.html: eliminado PIN por defecto y comportamiento inseguro; ahora requiere que el PIN esté configurado por el admin en el navegador/entorno seguro. (archivo reemplazado)
- .gitignore: añadidos patrones para ignorar archivos de entorno y build
- env.example.js: añadido ejemplo para crear env.js durante build (NO contiene valores reales)

Pasos urgentes que debes hacer ahora (ordenados):

1) Rota cualquier clave que haya estado expuesta (Supabase service_role, Stripe secret, etc.). Asume que están comprometidas.

2) No uses claves secretas en el frontend. Si necesitas operaciones seguras, implementa funciones serverless (Vercel Functions) que usen keys server-side (NO publicar sus valores en el repo).

3) Configura las variables de entorno en Vercel:
   - SUPABASE_URL (público)
   - SUPABASE_KEY (la clave de solo cliente / publishable)
   - STRIPE_* en sus variantes (pk_ para cliente está bien en frontend si corresponde; sk_ solo server-side)

4) En tu proyecto Vercel, añade un paso build que cree `env.js` a partir de las variables de entorno públicas. Ejemplo (agregar como build script):
   - echo "window.__ENV = { SUPABASE_URL: '\"$SUPABASE_URL\"', SUPABASE_KEY: '\"$SUPABASE_KEY\"' }" > ./public/env.js
   - Asegúrate de que `env.js` esté en .gitignore y sea generado en tiempo de build.

5) Para limpiar historial de Git (si alguna clave sensible estuvo ya en commits anteriores): usa git-filter-repo o BFG para eliminar la clave del historial y luego fuerza push. Te puedo preparar los comandos cuando confirmes que quieres proceder.

6) Revisa los archivos del repo para otras claves (Stripe, Firebase, Google APIs, claves PEM). Si quieres, ejecuto un escaneo adicional o lo hago por ti si me autorizas a crear más scripts.

Notas:
- He dejado un archivo env.example.js (sin valores secretos) que muestra el formato a generar durante el build.
- Después de revisar y rotar claves, puedo ayudarte a implementar funciones serverless para operaciones sensibles (por ejemplo: emitir GRU, procesar pagos, enviar emails) usando los secretos en Vercel.

