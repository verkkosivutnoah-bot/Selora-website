// Vercel serverless function — Retell API proxy
// Keeps the API key server-side so it's never exposed in the browser.
//
// Deploy steps:
//   1. Push this file to your repo (Vercel picks it up automatically)
//   2. In Vercel dashboard → Project → Settings → Environment Variables
//      add:  RETELL_API_KEY = key_f47b664ba981bfa8d161af585ba5
//   3. Redeploy — done.

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.RETELL_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  try {
    const { agent_id } = req.body;

    const response = await fetch('https://api.retellai.com/v2/create-web-call', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ agent_id }),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    return res.status(200).json(data);

  } catch (err) {
    console.error('[create-call] Error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
