# RelocatePass - Plataforma de Asesoría Migratoria en Brasil

**RelocatePass** es una plataforma web integral y PWA especializada en asesoría migratoria para extranjeros en Brasil (Residencia Temporal, Residencia Permanente, Naturalización Brasileña, Trámite de CRNM y emisión de tasa GRU conforme a la Ley 13.445/2017 y Decreto 9.199/2017).

---

## 🚀 Estructura del Proyecto

- `index.html` - Portal principal con diagnóstico migratorio inteligente, catálogo de servicios, checklist interactivo y modales de cumplimiento legal (LGPD y CDC).
- `dashboard.html` - Panel privado del cliente para seguimiento de expediente, validación digital de documentos, guías de tasa GRU y SISMIGRA.
- `admin.html` - Panel administrativo con control de accesos por PIN (`2026` o `1234`), métricas diarias/semanales, supervisión de trámites, gestión financiera y CSAT.
- `server.js` - Servidor Node.js con Express para servir la aplicación en producción y desarrollo local.
- `auth.js` - Módulo de autenticación con email/contraseña y Google OAuth conectado a Supabase.
- `db.js` - Inicialización y conexión unificada a la base de datos Supabase.
- `pagos.js` - Pasarela de pago con Stripe (tarjeta de crédito/débito) y sistema Pix Copia e Cola.
- `documentos.js` - Gestor de almacenamiento y validación de documentos en Supabase Storage.
- `script.js` - Lógica del diagnóstico migratorio, interacción de interfaz y PWA.
- `service-worker.js` & `manifest.json` - Configuración completa para Progressive Web App (PWA).
- `styles.css` - Diseño responsivo y optimizado con paleta institucional.

---

## ⚙️ Configuración de Base de Datos y Stripe

### 1. Supabase (Base de Datos & Auth)
- **URL del proyecto:** `https://wdhvycncwfydpgeqlvwb.supabase.co`
- **Tablas configuradas:**
  - `usuarios` - Perfiles de usuarios registrados.
  - `servicios_comprados` - Historial de pedidos y estado de contratación.
  - `documentos` - Expedientes y enlaces a archivos subidos.
  - `perfil_usuario` - Información migratoria extendida (RNE, CPF, pasaporte).

### 2. Stripe & Pagos
- **Public Key:** Configurada en `pagos.js` y `.env.example`
- **Pagos Pix:** Clave Pix oficial `relocatepass@gmail.com` integrada con copia rápida en un clic.

---

## 📦 Instrucciones para Subir a tu Repositorio en GitHub

Para subir este proyecto a un nuevo repositorio en tu cuenta de GitHub (`relocatepass`):

1. **Crear repositorio en GitHub:**
   - Ve a [GitHub](https://github.com/new) y crea un nuevo repositorio llamado `RelocatePass` (público o privado).

2. **Inicializar y subir desde la terminal:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit - RelocatePass plataforma migratoria v1.0"
   git branch -M main
   git remote add origin https://github.com/TU_USUARIO/RelocatePass.git
   git push -u origin main
   ```

3. **Exportación directa desde AI Studio:**
   - También puedes utilizar el menú de **Settings / Export** en Google AI Studio para descargar el archivo `.ZIP` o vincular directamente con tu cuenta de GitHub.

---

## 🛠️ Ejecución Local

```bash
npm install
npm run dev
```
La aplicación estará disponible en `http://localhost:3000`.
