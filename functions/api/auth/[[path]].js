import { createClient } from ‘https://esm.sh/@supabase/supabase-js@2’;

function getSupabaseClient(env) {
return createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
}

const corsHeaders = {
‘Access-Control-Allow-Origin’: ‘*’,
‘Access-Control-Allow-Methods’: ‘GET, POST, OPTIONS’,
‘Access-Control-Allow-Headers’: ‘Content-Type, Authorization’,
};

function handleOptions() {
return new Response(null, { headers: corsHeaders });
}

async function handleSignup(request, env) {
const { email, password, name } = await request.json();
const supabase = getSupabaseClient(env);

const { data: authData, error: authError } = await supabase.auth.signUp({
email,
password,
options: { data: { name: name } }
});

if (authError) {
return new Response(JSON.stringify({ error: authError.message }), {
status: 400,
headers: { …corsHeaders, ‘Content-Type’: ‘application/json’ }
});
}

const { error: profileError } = await supabase
.from(‘profiles’)
.insert([{
id: authData.user.id,
name: name,
email: email,
created_at: new Date().toISOString()
}]);

if (profileError) console.error(‘Profile creation error:’, profileError);

return new Response(JSON.stringify({
user: authData.user,
session: authData.session
}), {
status: 200,
headers: { …corsHeaders, ‘Content-Type’: ‘application/json’ }
});
}

async function handleLogin(request, env) {
const { email, password } = await request.json();
const supabase = getSupabaseClient(env);

const { data, error } = await supabase.auth.signInWithPassword({
email,
password
});

if (error) {
return new Response(JSON.stringify({ error: error.message }), {
status: 401,
headers: { …corsHeaders, ‘Content-Type’: ‘application/json’ }
});
}

return new Response(JSON.stringify({
user: data.user,
session: data.session
}), {
status: 200,
headers: { …corsHeaders, ‘Content-Type’: ‘application/json’ }
});
}

async function handleGoogleAuth(request, env) {
const supabase = getSupabaseClient(env);

const { data, error } = await supabase.auth.signInWithOAuth({
provider: ‘google’,
options: {
redirectTo: ‘https://mphaven-app.pages.dev/api/auth/callback’
}
});

if (error) {
return new Response(JSON.stringify({ error: error.message }), {
status: 400,
headers: { …corsHeaders, ‘Content-Type’: ‘application/json’ }
});
}

return Response.redirect(data.url, 302);
}

async function handleCallback(request, env) {
const url = new URL(request.url);
const code = url.searchParams.get(‘code’);

if (!code) {
return Response.redirect(‘https://mphaven-app.pages.dev/login.html?error=no_code’, 302);
}

const supabase = getSupabaseClient(env);
const { data, error } = await supabase.auth.exchangeCodeForSession(code);

if (error) {
return Response.redirect(‘https://mphaven-app.pages.dev/login.html?error=auth_failed’, 302);
}

const { data: profile } = await supabase
.from(‘profiles’)
.select(’*’)
.eq(‘id’, data.user.id)
.single();

if (!profile) {
await supabase.from(‘profiles’).insert([{
id: data.user.id,
name: data.user.user_metadata.name || data.user.user_metadata.full_name || ‘User’,
email: data.user.email,
created_at: new Date().toISOString()
}]);
}

return Response.redirect(‘https://mphaven-app.pages.dev/app.html?session=’ + data.session.access_token, 302);
}

async function handleLogout(request, env) {
const supabase = getSupabaseClient(env);
const { error } = await supabase.auth.signOut();

if (error) {
return new Response(JSON.stringify({ error: error.message }), {
status: 400,
headers: { …corsHeaders, ‘Content-Type’: ‘application/json’ }
});
}

return new Response(JSON.stringify({ success: true }), {
status: 200,
headers: { …corsHeaders, ‘Content-Type’: ‘application/json’ }
});
}

export async function onRequest(context) {
const { request, env } = context;
const url = new URL(request.url);
const path = url.pathname.replace(’/api/auth/’, ‘’);

if (request.method === ‘OPTIONS’) {
return handleOptions();
}

try {
switch (path) {
case ‘signup’:
return await handleSignup(request, env);
case ‘login’:
return await handleLogin(request, env);
case ‘google’:
return await handleGoogleAuth(request, env);
case ‘callback’:
return await handleCallback(request, env);
case ‘logout’:
return await handleLogout(request, env);
default:
return new Response(JSON.stringify({ error: ‘Not found’ }), {
status: 404,
headers: { …corsHeaders, ‘Content-Type’: ‘application/json’ }
});
}
} catch (error) {
console.error(‘Auth error:’, error);
return new Response(JSON.stringify({ error: ‘Internal server error’ }), {
status: 500,
headers: { …corsHeaders, ‘Content-Type’: ‘application/json’ }
});
}
}
