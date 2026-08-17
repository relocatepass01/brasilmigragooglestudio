/* pagos.js - versión segura que utiliza una función serverless para crear PaymentIntents
   - Lee la PK pública de Stripe desde window.__ENV (generado en build)
   - Llama a /api/create-payment-intent para obtener client_secret
   - No contiene claves secretas en el frontend */

// ============================================
// SISTEMA DE PAGOS SEGUROS CON STRIPE (frontend)
// ============================================

function getSb() {
    return window.supabaseClient || (typeof getSupabase === 'function' ? getSupabase() : window.supabase);
}

let stripe = null;
let elements = null;
let cardElement = null;

function inicializarStripe() {
    try {
        const env = (window && window.__ENV) || {};
        const STRIPE_PUBLIC_KEY = env.STRIPE_PUBLIC_KEY || null;
        if (!STRIPE_PUBLIC_KEY) {
            console.warn('Stripe public key not set in window.__ENV');
            return;
        }
        if (typeof Stripe === 'function') {
            stripe = Stripe(STRIPE_PUBLIC_KEY);
            elements = stripe.elements();
            console.log('✅ Stripe inicializado (cliente)');
        }
    } catch (e) {
        console.error('Error inicializando Stripe:', e);
    }
}

// Registrar los servicios (se mantiene)
const servicios = {
    'naturalizacion': { nombre: 'Asesoría de Naturalización Brasileña', precio: 400, descripcion: '...' },
    'residencia-permanente': { nombre: 'Trámite de Residencia Permanente', precio: 200, descripcion: '...' },
    'residencia-temporal': { nombre: 'Residencia Temporal y Renovación', precio: 200, descripcion: '...' },
    'revision-documentos': { nombre: 'Asesoria para casos espaciales', precio: 200, descripcion: '...' },
    'creacion-empresa-mei': { nombre: 'Apertura de Empresa MEI para Inmigrantes', precio: 500, descripcion: '...' }
};
window.servicios = servicios;

// Crear pago: mantiene la inserción del registro como pendiente en Supabase
async function crearPago(servicioId) {
    try {
        const supabase = getSb();
        const usuarioId = localStorage.getItem('usuario_id');
        const email = localStorage.getItem('usuario_email');

        if (!usuarioId || !email) {
            alert('❌ Debes iniciar sesión o registrarte primero para contratar este servicio.');
            if (typeof showSection === 'function') { showSection('acceso'); } else { window.location.href = 'index.html#acceso'; }
            return false;
        }

        const servicio = servicios[servicioId];
        if (!servicio) { alert('❌ Servicio no encontrado'); return false; }

        const confirmacion = confirm(`¿Confirmas que deseas contratar:\n\n${servicio.nombre}\nPrecio: R$ ${servicio.precio.toFixed(2)}\n\n¿Continuar?`);
        if (!confirmacion) return false;

        alert('⏳ Procesando pago... Por favor espera');

        const { data, error } = await supabase
            .from('servicios_comprados')
            .insert([{ usuario_id: usuarioId, servicio_nombre: servicio.nombre, precio: servicio.precio, estado: 'pendiente', fecha_compra: new Date(), stripe_payment_id: null }])
            .select('id')
            .single();

        if (error) { alert('❌ Error al procesar pago: ' + error.message); return false; }

        localStorage.setItem('pago_pendiente', JSON.stringify({ id: data.id, servicioId: servicioId, servicio: servicio.nombre, precio: servicio.precio }));
        localStorage.setItem('tramite_activo_nombre', servicio.nombre);
        if (typeof actualizarIndicadorTramiteActivo === 'function') actualizarIndicadorTramiteActivo();

        mostrarFormularioPago(servicio, data.id);
        return true;
    } catch (error) {
        console.error('Error:', error);
        alert('❌ Error: ' + error.message);
        return false;
    }
}

// Mostrar formulario de pago: ahora integra Stripe Elements y crea PaymentIntent vía server
function mostrarFormularioPago(servicio, pagoId) {
    // Crear modal (simplificado)
    const modal = document.createElement('div');
    modal.id = 'modal-pago';
    modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:1000;';

    modal.innerHTML = `
        <div style="background:white;padding:24px;border-radius:8px;max-width:520px;width:100%;">
            <h2 style="color:#1a6b5e;margin-bottom:8px;">Pago Seguro</h2>
            <p style="color:#666;margin-bottom:12px;">Servicio: <strong>${servicio.nombre}</strong></p>
            <p style="color:#ff6b35;font-size:20px;font-weight:bold;margin-bottom:12px;">R$ ${servicio.precio.toFixed(2)}</p>

            <form id="formulario-stripe" style="margin-bottom:12px;">
                <label style="display:block;margin-bottom:6px;">Nombre en tarjeta</label>
                <input id="nombre-tarjeta" required style="width:100%;padding:10px;border:1px solid #ddd;border-radius:6px;margin-bottom:8px;" />

                <label style="display:block;margin-bottom:6px;">Email</label>
                <input type="email" id="email-tarjeta" value="${localStorage.getItem('usuario_email') || ''}" required style="width:100%;padding:10px;border:1px solid #ddd;border-radius:6px;margin-bottom:8px;" />

                <label style="display:block;margin-bottom:6px;">Datos de la tarjeta</label>
                <div id="stripe-card" style="padding:12px;border:1px solid #ddd;border-radius:6px;background:#fff;margin-bottom:10px;"></div>

                <button type="submit" style="width:100%;padding:12px;background:#ff6b35;color:#fff;border:none;border-radius:6px;font-weight:700;">💳 Pagar R$ ${servicio.precio.toFixed(2)}</button>
            </form>

            <button id="cancel-pago" style="width:100%;padding:10px;background:#f0f0f0;border:none;border-radius:6px;">Cancelar</button>
        </div>
    `;

    document.body.appendChild(modal);

    // Inicializar Stripe Elements si hace falta
    if (!stripe) inicializarStripe();
    if (!elements && stripe) elements = stripe.elements();

    // Crear card element
    if (elements) {
        cardElement = elements.create('card');
        const mountPoint = document.getElementById('stripe-card');
        if (mountPoint) cardElement.mount('#stripe-card');
    }

    // Form submit
    const form = document.getElementById('formulario-stripe');
    form.addEventListener('submit', async function (e) {
        e.preventDefault();
        const name = document.getElementById('nombre-tarjeta').value;
        const email = document.getElementById('email-tarjeta').value;

        try {
            // Llamar a la función server-side para crear PaymentIntent
            const resp = await fetch('/api/create-payment-intent', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ monto: Math.round(servicio.precio * 100), moneda: 'brl', pagoId: pagoId, descripcion: servicio.nombre, receipt_email: email })
            });

            const body = await resp.json();
            if (!resp.ok) throw new Error(body.error || 'Error creando PaymentIntent');

            const clientSecret = body.client_secret;
            if (!clientSecret) throw new Error('No se obtuvo client_secret');

            // Confirmar el pago con Stripe.js
            const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
                payment_method: { card: cardElement, billing_details: { name: name, email: email } }
            });

            if (stripeError) {
                alert('❌ Error en el pago: ' + stripeError.message);
                return;
            }

            if (paymentIntent && paymentIntent.status === 'succeeded') {
                // Actualizar estado en Supabase
                const supabase = getSb();
                await supabase.from('servicios_comprados').update({ estado: 'pagado', stripe_payment_id: paymentIntent.id }).eq('id', pagoId);
                alert('✅ Pago procesado exitosamente!');
                cerrarFormularioPago();
                setTimeout(() => location.reload(), 1200);
            } else {
                alert('❌ Pago no completado. Estado: ' + (paymentIntent ? paymentIntent.status : 'desconocido'));
            }

        } catch (err) {
            console.error(err);
            alert('❌ Error procesando el pago: ' + err.message);
        }
    });

    document.getElementById('cancel-pago').addEventListener('click', () => cerrarFormularioPago());
}

function cerrarFormularioPago() {
    const modal = document.getElementById('modal-pago');
    if (modal) modal.remove();
    if (cardElement) { try { cardElement.unmount(); } catch (e) {} }
}

// Otras funciones quedan sin cambios funcionales pero ya no contienen claves en el frontend

async function obtenerServiciosComprados(usuarioId) {
    try {
        const supabase = getSb();
        const { data, error } = await supabase.from('servicios_comprados').select('*').eq('usuario_id', usuarioId).order('fecha_compra', { ascending: false });
        if (error) { console.error('Error:', error); return []; }
        return data || [];
    } catch (error) { console.error('Error:', error); return []; }
}

async function cancelarServicio(pagoId) {
    try {
        const supabase = getSb();
        const confirmacion = confirm('¿Estás seguro de que deseas cancelar este servicio?');
        if (!confirmacion) return false;
        const { error } = await supabase.from('servicios_comprados').update({ estado: 'cancelado' }).eq('id', pagoId);
        if (error) { alert('❌ Error al cancelar: ' + error.message); return false; }
        alert('✅ Servicio cancelado'); location.reload(); return true;
    } catch (error) { console.error('Error:', error); alert('❌ Error: ' + error.message); return false; }
}

window.crearPago = crearPago;
window.abrirModalPagoDigital = function(n,m){ abrirModalPagoDigital(n,m); };

// Inicializar al cargar
document.addEventListener('DOMContentLoaded', function() { inicializarStripe(); console.log('✅ Sistema de pagos iniciado (modo seguro)'); });
