// functions/api/auth/[[path]].js
import { createClient } from '@supabase/supabase-js';

// CORS headers helper
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Add OPTIONS handler
export async function onRequestOptions() {
  return new Response(null, {
    headers: corsHeaders
  });
}

// Initialize Supabase client
function getSupabaseClient(env) {
  return createClient(
    env.SUPABASE_URL,
    env.SUPABASE_ANON_KEY
  );
}

async function handleSignup(request, env) {
  try {
    const { email, password, name } = await request.json();
    const supabase = getSupabaseClient(env);
    
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } }
    });
    
    if (authError) throw authError;
    
    // Create profile
    if (authData.user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert([
          { 
            id: authData.user.id,
            name: name,
            email: email,
            created_at: new Date().toISOString()
          }
        ]);
      
      if (profileError) console.error('Profile error:', profileError);
    }
    
    return new Response(JSON.stringify({ 
      user: authData.user,
      session: authData.session 
    }), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        ...corsHeaders 
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { 
        'Content-Type': 'application/json',
        ...corsHeaders 
      }
    });
  }
}

async function handleLogin(request, env) {
  try {
    const { email, password } = await request.json();
    const supabase = getSupabaseClient(env);
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) throw error;
    
    return new Response(JSON.stringify({ 
      user: data.user,
      session: data.session 
    }), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        ...corsHeaders 
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 401,
      headers: { 
        'Content-Type': 'application/json',
        ...corsHeaders 
      }
    });
  }
}

async function handleGoogleAuth(request, env) {
  const supabase = getSupabaseClient(env);
  const url = new URL(request.url);
  
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${url.origin}/api/auth/callback`,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent'
      }
    }
  });
  
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { 
        'Content-Type': 'application/json',
        ...corsHeaders 
      }
    });
  }
  
  return Response.redirect(data.url, 302);
}

async function handleCallback(request, env) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  
  if (!code) {
    return Response.redirect(`${url.origin}/login?error=no_code`, 302);
  }
  
  const supabase = getSupabaseClient(env);
  
  try {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (error) throw error;
    
    // Upsert profile for OAuth users
    if (data.user) {
      await supabase
        .from('profiles')
        .upsert({
          id: data.user.id,
          name: data.user.user_metadata.name || 
                data.user.user_metadata.full_name || 
                data.user.user_metadata.user_name ||
                'User',
          email: data.user.email,
          avatar_url: data.user.user_metadata.avatar_url,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'id'
        });
    }
    
    // Set cookie or redirect with token
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Authenticating...</title>
          <script>
            localStorage.setItem('supabase.auth.token', '${data.session.access_token}');
            window.location.href = '${url.origin}/app';
          </script>
        </head>
        <body>
          <p>Redirecting...</p>
        </body>
      </html>
    `;
    
    return new Response(html, {
      status: 200,
      headers: { 'Content-Type': 'text/html' }
    });
    
  } catch (error) {
    console.error('Callback error:', error);
    return Response.redirect(`${url.origin}/login?error=auth_failed`, 302);
  }
}

async function handleLogout(request, env) {
  const supabase = getSupabaseClient(env);
  
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        ...corsHeaders 
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { 
        'Content-Type': 'application/json',
        ...corsHeaders 
      }
    });
  }
}

// Main handler
export async function onRequest(context) {
  const { request, env } = context;
  
  // Handle OPTIONS requests
  if (request.method === 'OPTIONS') {
    return onRequestOptions();
  }
  
  const url = new URL(request.url);
  const path = url.pathname.replace('/api/auth/', '');
  
  switch (path) {
    case 'signup':
      if (request.method === 'POST') return handleSignup(request, env);
      break;
    case 'login':
      if (request.method === 'POST') return handleLogin(request, env);
      break;
    case 'google':
      return handleGoogleAuth(request, env);
    case 'callback':
      return handleCallback(request, env);
    case 'logout':
      if (request.method === 'POST') return handleLogout(request, env);
      break;
  }
  
  // Method not allowed or not found
  return new Response(JSON.stringify({ error: 'Not found' }), {
    status: 404,
    headers: { 
      'Content-Type': 'application/json',
      ...corsHeaders 
    }
  });
}
