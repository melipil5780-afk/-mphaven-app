// functions/api/auth/[[path]].js
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function onRequest(context) {
  const { request, env } = context;
  
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  const url = new URL(request.url);
  const path = url.pathname.split('/').pop();
  
  if (path === 'login' && request.method === 'POST') {
    const { email, password } = await request.json();
    
    // Call Supabase Auth directly via fetch
    const response = await fetch(`${env.SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': env.SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${env.SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({ email, password })
    });
    
    const data = await response.json();
    
    return Response.json(data, { headers: corsHeaders });
  }
  
  return new Response('Not found', { status: 404, headers: corsHeaders });
}
