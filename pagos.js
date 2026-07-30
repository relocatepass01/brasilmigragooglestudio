// ============================================
// SISTEMA DE PAGOS SEGUROS CON STRIPE
// ============================================

function getSb() {
    return window.supabaseClient || (typeof getSupabase === 'function' ? getSupabase() : window.supabase);
}

const STRIPE_PUBLIC_KEY = 'pk_test_51TwAUmEztBvHow2TiSQWQTCcNa2eEpFVj37ysELQInAUCA7LjC42K7DPgF4LaUUfJPNWolWd093ETEcmbeCNaqdl00wbEj5Z0b';
let stripe = null;

function inicializarStripe() {
    if (typeof Stripe === 'function') {
        stripe = Stripe(STRIPE_PUBLIC_KEY);
        console.log('✅ Stripe inicializado');
    }
}

// ============================================
// SERVICIOS Y PRECIOS
// ============================================

const servicios = {
    'naturalizacion': {
        nombre: 'Asesoría de Naturalización Brasileña',
        precio: 50000,
        duracion: '6 a 18 meses',
        descripcion: 'Acompañamiento completo para obtener la nacionalidad brasileña'
    },
    'residencia-permanente': {
        nombre: 'Trámite de Residencia Permanente',
        precio: 75000,
        duracion: '3 a 6 meses',
        descripcion: 'Gestión completa de residencia permanente'
    },
    'residencia-temporal': {
        nombre: 'Residencia Temporal y Renovación',
        precio: 100000,
        duracion: '2 a 4 meses',
        descripcion: 'Solicitud de renovación de residencia temporal'
    },
    'revision-documentos': {
        nombre: 'Revisión de Documentos',
        precio: 50000,
        duracion: '5 a 7 días',
        descripcion: 'Revisión profesional de documentación migratoria'
    }
};

window.servicios = servicios;

// ============================================
// CREAR SESIÓN DE PAGO
// ============================================

async function crearPago(servicioId) {
    try {
        const supabase = getSb();
        const usuarioId = localStorage.getItem('usuario_id');
        const email = localStorage.getItem('usuario_email');

        if (!usuarioId || !email) {
            alert('❌ Debes iniciar sesión primero');
            window.location.href = 'index.html';
            return false;
        }

        const servicio = servicios[servicioId];
        if (!servicio) {
            alert('❌ Servicio no encontrado');
            return false;
        }

        const confirmacion = confirm(
            `¿Confirmas que deseas contratar:\n\n${servicio.nombre}\nPrecio: R$ ${(servicio.precio / 100).toFixed(2)}\n\n¿Continuar?`
        );

        if (!confirmacion) {
            return false;
        }

        alert('⏳ Procesando pago... Por favor espera');

        const { data, error } = await supabase
            .from('servicios_comprados')
            .insert([
                {
                    usuario_id: usuarioId,
                    servicio_nombre: servicio.nombre,
                    precio: servicio.precio / 100,
                    estado: 'pendiente',
                    fecha_compra: new Date(),
                    stripe_payment_id: 'generando...'
                }
            ])
            .select('id')
            .single();

        if (error) {
            alert('❌ Error al procesar pago: ' + error.message);
            return false;
        }

        alert(`✅ Pago registrado como pendiente\n\nID de transacción: ${data.id}\n\nEn breve se abrirá el formulario de pago`);

        localStorage.setItem('pago_pendiente', JSON.stringify({
            id: data.id,
            servicioId: servicioId,
            servicio: servicio.nombre,
            precio: servicio.precio / 100
        }));

        mostrarFormularioPago(servicio, data.id);

        return true;

    } catch (error) {
        console.error('Error:', error);
        alert('❌ Error: ' + error.message);
        return false;
    }
}

// ============================================
// MOSTRAR FORMULARIO DE PAGO
// ============================================

function mostrarFormularioPago(servicio, pagoId) {
    const modal = document.createElement('div');
    modal.id = 'modal-pago';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
    `;

    modal.innerHTML = `
        <div style="
            background: white;
            padding: 40px;
            border-radius: 8px;
            max-width: 500px;
            width: 100%;
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
        ">
            <h2 style="color: #1a6b5e; margin-bottom: 10px;">Pago Seguro</h2>
            <p style="color: #666; margin-bottom: 30px;">Completa tu pago de forma segura</p>

            <div style="background: #f4f7f6; padding: 15px; border-radius: 8px; margin-bottom: 25px;">
                <p style="margin: 0 0 10px 0; color: #666; font-size: 14px;">Servicio:</p>
                <h3 style="margin: 0 0 10px 0; color: #1a6b5e;">${servicio.nombre}</h3>
                <p style="margin: 0; color: #ff6b35; font-size: 24px; font-weight: bold;">
                    R$ ${(servicio.precio / 100).toFixed(2)}
                </p>
            </div>

            <form id="formulario-stripe" style="margin-bottom: 20px;">
                <div style="margin-bottom: 15px;">
                    <label style="display: block; color: #333; margin-bottom: 8px; font-weight: 600;">Nombre en tarjeta</label>
                    <input type="text" id="nombre-tarjeta" placeholder="Juan Perez" required style="
                        width: 100%;
                        padding: 12px;
                        border: 1px solid #ddd;
                        border-radius: 8px;
                        font-size: 14px;
                    ">
                </div>

                <div style="margin-bottom: 15px;">
                    <label style="display: block; color: #333; margin-bottom: 8px; font-weight: 600;">Email</label>
                    <input type="email" value="${localStorage.getItem('usuario_email') || ''}" disabled style="
                        width: 100%;
                        padding: 12px;
                        border: 1px solid #ddd;
                        border-radius: 8px;
                        font-size: 14px;
                        background-color: #f5f5f5;
                    ">
                </div>

                <div style="margin-bottom: 20px;">
                    <label style="display: block; color: #333; margin-bottom: 8px; font-weight: 600;">Datos de la tarjeta</label>
                    <div id="stripe-card" style="
                        border: 1px solid #ddd;
                        border-radius: 8px;
                        padding: 12px;
                        background: white;
                    "></div>
                </div>

                <button type="submit" style="
                    width: 100%;
                    padding: 14px;
                    background: #ff6b35;
                    color: white;
                    border: none;
                    border-radius: 8px;
                    font-weight: bold;
                    font-size: 16px;
                    cursor: pointer;
                    transition: background 0.3s;
                ">
                    💳 Pagar R$ ${(servicio.precio / 100).toFixed(2)}
                </button>
            </form>

            <p style="text-align: center; color: #999; font-size: 12px; margin-bottom: 10px;">
                🔒 Pago seguro. Tu información está protegida.
            </p>

            <button onclick="cerrarFormularioPago()" style="
                width: 100%;
                padding: 12px;
                background: #f0f0f0;
                color: #333;
                border: none;
                border-radius: 8px;
                cursor: pointer;
                font-weight: 600;
            ">
                Cancelar
            </button>
        </div>
    `;

    document.body.appendChild(modal);
}

function cerrarFormularioPago() {
    const modal = document.getElementById('modal-pago');
    if (modal) {
        modal.remove();
    }
}

async function simularPagoExitoso(pagoId) {
    try {
        const supabase = getSb();
        const { error } = await supabase
            .from('servicios_comprados')
            .update({
                estado: 'pagado',
                stripe_payment_id: 'sim_' + Date.now()
            })
            .eq('id', pagoId);

        if (error) {
            alert('❌ Error: ' + error.message);
            return false;
        }

        alert('✅ Pago procesado exitosamente!');
        cerrarFormularioPago();
        
        setTimeout(() => {
            location.reload();
        }, 2000);

        return true;

    } catch (error) {
        console.error('Error:', error);
        alert('❌ Error: ' + error.message);
        return false;
    }
}

async function obtenerServiciosComprados(usuarioId) {
    try {
        const supabase = getSb();
        const { data, error } = await supabase
            .from('servicios_comprados')
            .select('*')
            .eq('usuario_id', usuarioId)
            .order('fecha_compra', { ascending: false });

        if (error) {
            console.error('Error:', error);
            return [];
        }

        return data || [];

    } catch (error) {
        console.error('Error:', error);
        return [];
    }
}

async function cancelarServicio(pagoId) {
    try {
        const supabase = getSb();
        const confirmacion = confirm('¿Estás seguro de que deseas cancelar este servicio?');
        
        if (!confirmacion) {
            return false;
        }

        const { error } = await supabase
            .from('servicios_comprados')
            .update({ estado: 'cancelado' })
            .eq('id', pagoId);

        if (error) {
            alert('❌ Error al cancelar: ' + error.message);
            return false;
        }

        alert('✅ Servicio cancelado');
        location.reload();
        return true;

    } catch (error) {
        console.error('Error:', error);
        alert('❌ Error: ' + error.message);
        return false;
    }
}

document.addEventListener('DOMContentLoaded', function() {
    inicializarStripe();
    console.log('✅ Sistema de pagos iniciado');
});
