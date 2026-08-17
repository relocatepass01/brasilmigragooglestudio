// api/create-checkout-session.js
// Serverless function for Vercel: creates a Stripe Checkout session and records a pending purchase in Supabase (server-side)

const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Simple server-side price catalog (authoritative)
const servicios = {
  'naturalizacion': { nombre: 'Asesoría de Naturalización Brasileña', precio: 400 },
  'residencia-permanente': { nombre: 'Trámite de Residencia Permanente', precio: 200 },
  'residencia-temporal': { nombre: 'Residencia Temporal y Renovación', precio: 200 },
  'revision-documentos': { nombre: 'Revisión de Documentos', precio: 200 },
  'creacion-empresa-mei': { nombre: 'Creación de Empresa MEI', precio: 500 }
};

module.exports = async (req, res) => {
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { servicioId, usuarioId, email } = req.body || {};
    if (!servicioId || !servicios[servicioId]) return res.status(400).json({ error: 'Servicio inválido' });

    const servicio = servicios[servicioId];
    const amountBRL = Math.round(servicio.precio * 100); // cents

    // Create a pending record in Supabase (so we can track it before checkout completes)
    const { data, error } = await supabase
      .from('servicios_comprados')
      .insert([
        {
          usuario_id: usuarioId || null,
          servicio_nombre: servicio.nombre,
          precio: servicio.precio,
          estado: 'pendiente',
          fecha_compra: new Date().toISOString(),
          stripe_session_id: null
        }
      ])
      .select('id')
      .single();

    if (error) {
      console.error('Supabase insert error:', error);
      return res.status(500).json({ error: 'No se pudo registrar el pago' });
    }

    // Create Stripe Checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'brl',
            product_data: { name: servicio.nombre },
            unit_amount: amountBRL
          },
          quantity: 1
        }
      ],
      metadata: { compra_id: data.id },
      success_url: `${process.env.APP_URL}/dashboard.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.APP_URL}/dashboard.html?canceled=true`
    });

    // Update the Supabase record with the stripe session id
    const { error: updateError } = await supabase
      .from('servicios_comprados')
      .update({ stripe_session_id: session.id })
      .eq('id', data.id);
    if (updateError) {
      console.error('Supabase update error:', updateError);
      // continue — session created, but record may not be updated
    }

    res.status(200).json({ sessionId: session.id });
  } catch (err) {
    console.error('Error in create-checkout-session:', err);
    res.status(500).json({ error: 'Error interno' });
  }
};
