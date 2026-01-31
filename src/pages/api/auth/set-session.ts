/**
 * Set Session API Endpoint
 * Ustawia session w Supabase na podstawie tokenów z callback
 *
 * Used by: /auth/callback.astro
 */

import type { APIRoute } from "astro";

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const body = await request.json();
    const { access_token, refresh_token } = body;

    if (!access_token || !refresh_token) {
      return new Response(JSON.stringify({ error: "Missing tokens" }), { status: 400 });
    }

    // Ustaw session w Supabase
    const { error } = await locals.supabase.auth.setSession({
      access_token,
      refresh_token,
    });

    if (error) {
      console.error("Error setting session:", error);
      return new Response(JSON.stringify({ error: "Failed to set session" }), { status: 500 });
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error) {
    console.error("Unexpected error in set-session:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500 });
  }
};
