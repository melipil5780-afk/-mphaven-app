// functions/api/auth/[[path]].js
// Cloudflare Pages Functions for authentication

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// Initialize Supabase client (using fetch API directly)
async function callSupabase(env, endpoint, method = "GET", body = null) {
  const headers = {
    "apikey": env.SUPABASE_ANON_KEY,
    "Authorization": `Bearer ${env.SUPABASE_ANON_KEY}`,
    "Content-Type": "application/json",
  };

  const options = {
    method,
    headers,
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${env.SUPABASE_URL}${endpoint}`, options);
  return response.json();
}

// Handle OPTIONS requests
function handleOptions() {
  return new Response(null, {
    headers: corsHeaders
  });
}

// Sign up new user
async function handleSignup(request, env) {
  try {
    const { email, password, name } = await request.json();

    // Sign up via Supabase Auth API
    const authResponse = await callSupabase(
      env,
      "/auth/v1/signup",
      "POST",
      {
        email,
        password,
        data: { name }
      }
    );

    if (authResponse.error) {
      return new Response(JSON.stringify({ error: authResponse.error.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Create profile in database
    if (authResponse.user) {
      await callSupabase(
        env,
        "/rest/v1/profiles",
        "POST",
        {
          id: authResponse.user.id,
          name: name,
          email: email,
          created_at: new Date().toISOString()
        }
      );
    }

    return new Response(JSON.stringify({
      user: authResponse.user,
      session: authResponse.session
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("Signup error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
}

// Login existing user
async function handleLogin(request, env) {
  try {
    const { email, password } = await request.json();

    const authResponse = await callSupabase(
      env,
      "/auth/v1/token?grant_type=password",
      "POST",
      { email, password }
    );

    if (authResponse.error) {
      return new Response(JSON.stringify({ error: authResponse.error.message }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({
      user: authResponse.user,
      session: authResponse
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("Login error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
}

// Google OAuth
async function handleGoogleAuth(request, env) {
  const url = new URL(request.url);
  const redirectUrl = `${url.origin}/api/auth/callback`;
  
  // Redirect to Supabase Google OAuth
  const oauthUrl = `${env.SUPABASE_URL}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(redirectUrl)}`;
  
  return Response.redirect(oauthUrl, 302);
}

// Auth callback
async function handleCallback(request, env) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const accessToken = url.searchParams.get("access_token");
  const refreshToken = url.searchParams.get("refresh_token");

  if (!code && !accessToken) {
    return Response.redirect(`${url.origin}/login.html?error=no_code`, 302);
  }

  if (accessToken) {
    // Direct token from OAuth
    return Response.redirect(`${url.origin}/app.html#access_token=${accessToken}&refresh_token=${refreshToken}`, 302);
  }

  // Exchange code for session
  try {
    const tokenResponse = await callSupabase(
      env,
      "/auth/v1/token?grant_type=authorization_code",
      "POST",
      { code }
    );

    if (tokenResponse.error) {
      return Response.redirect(`${url.origin}/login.html?error=auth_failed`, 302);
    }

    return Response.redirect(`${url.origin}/app.html#access_token=${tokenResponse.access_token}&refresh_token=${tokenResponse.refresh_token}`, 302);
  } catch (error) {
    console.error("Callback error:", error);
    return Response.redirect(`${url.origin}/login.html?error=auth_failed`, 302);
  }
}

// Logout
async function handleLogout(request, env) {
  try {
    const authHeader = request.headers.get("Authorization");
    
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      
      await fetch(`${env.SUPABASE_URL}/auth/v1/logout`, {
        method: "POST",
        headers: {
          "apikey": env.SUPABASE_ANON_KEY,
          "Authorization": `Bearer ${token}`,
        }
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("Logout error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
}

// Main handler
export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname.replace("/api/auth/", "").replace("/api/auth", "");

  // Handle OPTIONS for CORS
  if (request.method === "OPTIONS") {
    return handleOptions();
  }

  try {
    // Route to appropriate handler
    if (path === "signup" || path === "signup/") {
      return await handleSignup(request, env);
    } else if (path === "login" || path === "login/") {
      return await handleLogin(request, env);
    } else if (path === "google" || path === "google/") {
      return await handleGoogleAuth(request, env);
    } else if (path === "callback" || path === "callback/") {
      return await handleCallback(request, env);
    } else if (path === "logout" || path === "logout/") {
      return await handleLogout(request, env);
    } else {
      return new Response(JSON.stringify({ error: "Not found", path: path }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
  } catch (error) {
    console.error("Auth error:", error);
    return new Response(JSON.stringify({ error: "Internal server error", details: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
}
