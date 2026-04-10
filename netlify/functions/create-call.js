export default async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const { agent_id } = await req.json();

  if (!agent_id) {
    return new Response(JSON.stringify({ error: 'agent_id puuttuu' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const res = await fetch('https://api.retellai.com/v2/create-web-call', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + process.env.RETELL_API_KEY,
    },
    body: JSON.stringify({ agent_id }),
  });

  const data = await res.json();

  if (!res.ok) {
    console.error('[create-call] Retell error:', data);
    return new Response(JSON.stringify({ error: data.message || 'Retell API virhe' }), {
      status: res.status,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ access_token: data.access_token }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

export const config = { path: '/api/create-call' };
