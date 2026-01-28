// functions/api/auth/[[path]].js
export async function onRequest(context) {
const { request, env } = context;
const url = new URL(request.url);
const path = url.pathname.replace(’/api/auth/’, ‘’);

const corsHeaders = {
‘Access-Control-Allow-Origin’: ‘*’,
‘Access-Control-Allow-Methods’: ‘GET, POST, OPTIONS’,
‘Access-Control-Allow-Headers’: ‘Content-Type, Authorization’,
};

if (request.method === ‘OPTIONS’) {
return new Response(null, { headers: corsHeaders });
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
case ‘session’:
return await handleGetSession(request, env);
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

async function handleSignup(request, env) {
const { email, password, name } = await request.json();

const { createClient } = await import(’@supabase/supabase-js’);
const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);

const { data: authData, error: authError } = await supabase.auth.signUp({
email,
password,
options: { data: { name: name } }
});

if (authError) {
return new Response(JSON.stringify({ error: authError.message }), {
status: 400,
headers: {
‘Content-Type’: ‘application/json’,
‘Access-Control-Allow-Origin’: ‘*’
}
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

if (profileError) {
console.error(‘Profile error:’, profileError);
}

return new Response(JSON.stringify({
user: authData.user,
session: authData.session
}), {
status: 200,
headers: {
‘Content-Type’: ‘application/json’,
‘Access-Control-Allow-Origin’: ‘*’
}
});
}

async function handleLogin(request, env) {
const { email, password } = await request.json();

const { createClient } = await import(’@supabase/supabase-js’);
const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);

const { data, error } = await supabase.auth.signInWithPassword({
email,
password
});

if (error) {
return new Response(JSON.stringify({ error: error.message }), {
status: 401,
headers: {
‘Content-Type’: ‘application/json’,
‘Access-Control-Allow-Origin’: ‘*’
}
});
}

return new Response(JSON.stringify({
user: data.user,
session: data.session
}), {
status: 200,
headers: {
‘Content-Type’: ‘application/json’,
‘Access-Control-Allow-Origin’: ‘*’
}
});
}

async function handleGoogleAuth(request, env) {
const { createClient } = await import(’@supabase/supabase-js’);
const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);

const { data, error } = await supabase.auth.signInWithOAuth({
provider: ‘google’,
options: {
redirectTo: ‘https://mphaven-app.pages.dev/api/auth/callback’
}
});

if (error) {
return new Response(JSON.stringify({ error: error.message }), {
status: 400,
headers: {
‘Content-Type’: ‘application/json’,
‘Access-Control-Allow-Origin’: ‘*’
}
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

const { createClient } = await import(’@supabase/supabase-js’);
const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);

const { data, error } = await supabase.auth.exchangeCodeForSession(code);

if (error) {
console.error(‘Exchange code error:’, error);
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

const sessionHTML = ‘<!DOCTYPE html><html><head><script type="module">import{createClient}from”https://esm.sh/@supabase/supabase-js@2”;const supabase=createClient(”’ + env.SUPABASE_URL + ‘”,”’ + env.SUPABASE_ANON_KEY + ‘”);supabase.auth.setSession({access_token:”’ + data.session.access_token + ‘”,refresh_token:”’ + data.session.refresh_token + ‘”}).then(()=>{window.location.href=”/app.html”})</script></head><body><p>Logging you in…</p></body></html>’;

return new Response(sessionHTML, {
status: 200,
headers: { ‘Content-Type’: ‘text/html’ }
});
}

async function handleLogout(request, env) {
const { createClient } = await import(’@supabase/supabase-js’);
const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);

const { error } = await supabase.auth.signOut();

if (error) {
return new Response(JSON.stringify({ error: error.message }), {
status: 400,
headers: {
‘Content-Type’: ‘application/json’,
‘Access-Control-Allow-Origin’: ‘*’
}
});
}

return new Response(JSON.stringify({ success: true }), {
status: 200,
headers: {
‘Content-Type’: ‘application/json’,
‘Access-Control-Allow-Origin’: ‘*’
}
});
}

async function handleGetSession(request, env) {
const { createClient } = await import(’@supabase/supabase-js’);
const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);

const { data: { session }, error } = await supabase.auth.getSession();

if (error) {
return new Response(JSON.stringify({ error: error.message }), {
status: 400,
headers: {
‘Content-Type’: ‘application/json’,
‘Access-Control-Allow-Origin’: ‘*’
}
});
}

return new Response(JSON.stringify({ session }), {
status: 200,
headers: {
‘Content-Type’: ‘application/json’,
‘Access-Control-Allow-Origin’: ‘*’
}
});
}
