// Vercel Serverless Function: api/create-payment-intent/index.js
// Crea un PaymentIntent usando la clave secreta de Stripe almacenada en Vercel env vars.

import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2022-11-15' });

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { monto, moneda = 'brl', pagoId, descripcion = 'Pago RelocatePass', receipt_email } = req.body;
    if (!monto) return res.status(400).json({ error: 'Missing amount' });

    const paymentIntent = await stripe.paymentIntents.create({
      amount: monto,
      currency: moneda,
      description: descripcion,
      receipt_email: receipt_email,
      metadata: { pagoId: String(pagoId || '') }
    });

    return res.status(200).json({ client_secret: paymentIntent.client_secret });
  } catch (err) {
    console.error('Error creating payment intent:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
