/**
 * Server-Side Authentication Helpers
 * Funkcje pomocnicze do sprawdzania autentykacji w stronach Astro (SSR)
 */

import type { AstroGlobal } from "astro";
import type { User } from "@supabase/supabase-js";

/**
 * Pobiera zalogowanego użytkownika z sesji (server-side)
 *
 * @param Astro - Astro global object
 * @returns User object lub null jeśli niezalogowany
 *
 * @example
 * ```astro
 * ---
 * const user = await getAuthenticatedUser(Astro);
 * if (!user) {
 *   // Użytkownik niezalogowany
 * }
 * ---
 * ```
 */
export async function getAuthenticatedUser(Astro: AstroGlobal): Promise<User | null> {
  const supabase = Astro.locals.supabase;

  if (!supabase) {
    console.error("Supabase client not found in locals. Make sure supabaseMiddleware is configured.");
    return null;
  }

  try {
    // Sprawdź session w Supabase
    const { data, error } = await supabase.auth.getSession();

    if (error) {
      console.error("Error getting session:", error);
      return null;
    }

    if (!data.session) {
      return null;
    }

    return data.session.user;
  } catch (error) {
    console.error("Unexpected error in getAuthenticatedUser:", error);
    return null;
  }
}

/**
 * Wymusza autentykację - przekierowuje na /login jeśli brak sesji
 * Używane w protected pages
 *
 * @param Astro - Astro global object
 * @returns User object (zawsze, bo inaczej następuje redirect)
 * @throws Astro.redirect jeśli użytkownik niezalogowany
 *
 * @example
 * ```astro
 * ---
 * import { requireAuth } from '@/lib/auth/server-auth';
 *
 * // Automatyczne przekierowanie na /login jeśli niezalogowany
 * const user = await requireAuth(Astro);
 *
 * // Kod poniżej wykona się tylko dla zalogowanych użytkowników
 * ---
 * <Layout user={user}>
 *   <!-- Chroniona treść -->
 * </Layout>
 * ```
 */
export async function requireAuth(Astro: AstroGlobal): Promise<User> {
  const user = await getAuthenticatedUser(Astro);

  if (!user) {
    // Przekieruj na stronę główną (/) gdzie jest AuthPanel
    // TypeScript: ta funkcja nigdy nie zwróci null, bo redirect przerywa wykonanie
    throw Astro.redirect("/");
  }

  return user;
}

/**
 * Sprawdza czy użytkownik jest zalogowany (boolean)
 * Przydatne gdy nie potrzebujemy obiektu User, tylko info czy zalogowany
 *
 * @param Astro - Astro global object
 * @returns true jeśli zalogowany, false w przeciwnym razie
 *
 * @example
 * ```astro
 * ---
 * const isAuthenticated = await isUserAuthenticated(Astro);
 * ---
 * {isAuthenticated ? (
 *   <p>Witaj, jesteś zalogowany!</p>
 * ) : (
 *   <a href="/login">Zaloguj się</a>
 * )}
 * ```
 */
export async function isUserAuthenticated(Astro: AstroGlobal): Promise<boolean> {
  const user = await getAuthenticatedUser(Astro);
  return user !== null;
}
