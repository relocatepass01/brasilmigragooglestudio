// api/config.js
// Vercel serverless function to expose only public configuration to the client

module.exports = (req, res) => {
  res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
  res.json({
    SUPABASE_URL: process.env.SUPABASE_URL || '',
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || '',
    STRIPE_PUBLIC_KEY: process.env.STRIPE_PUBLIC_KEY || ''
  });
};
