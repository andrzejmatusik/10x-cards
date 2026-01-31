/**
 * Sign Out API Endpoint
 * Wylogowuje użytkownika i czyści session po stronie serwera
 *
 * Used by: AuthService.signOut()
 */

import type { APIRoute } from "astro";

export const POST: APIRoute = async ({ locals }) => {
  try {
    // Wyloguj użytkownika w Supabase (server-side)
    const { error } = await locals.supabase.auth.signOut();

    if (error) {
      console.error("Error signing out:", error);
      // Nie zwracamy błędu 500, bo chcemy aby klient kontynuował czyszczenie localStorage
      return new Response(JSON.stringify({ success: true, warning: "Server signout failed" }), {
        status: 200,
      });
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error) {
    console.error("Unexpected error in signout:", error);
    // Nie zwracamy błędu 500, bo chcemy aby klient kontynuował czyszczenie localStorage
    return new Response(JSON.stringify({ success: true, warning: "Unexpected error" }), { status: 200 });
  }
};
