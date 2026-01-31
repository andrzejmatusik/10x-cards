/**
 * Page Authentication Middleware
 * Sprawdza autentykację dla chronionych stron (nie tylko API routes)
 *
 * Automatycznie przekierowuje niezalogowanych użytkowników na /login
 * z zapisaną ścieżką do powrotu po zalogowaniu
 */

import type { MiddlewareHandler } from "astro";

/**
 * Lista chronionych routes wymagających autentykacji
 * Każdy route zaczynający się od tych ścieżek wymaga zalogowania
 */
const PROTECTED_ROUTES = ["/generate", "/flashcards", "/account", "/settings"];

/**
 * Sprawdza czy route jest chroniony
 */
function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

/**
 * Middleware sprawdzający autentykację dla chronionych stron
 *
 * Działanie:
 * 1. Ignoruje API routes (obsługiwane przez authMiddleware)
 * 2. Ignoruje public routes
 * 3. Dla protected routes sprawdza sesję w Supabase
 * 4. Przekierowuje na /login z query param redirect jeśli brak sesji
 * 5. Zapisuje user do locals dla łatwego dostępu w pages
 */
export const pageAuthMiddleware: MiddlewareHandler = async (context, next) => {
  const { url, locals, redirect } = context;

  // Ignoruj API routes (obsługiwane przez authMiddleware)
  if (url.pathname.startsWith("/api")) {
    return next();
  }

  // Ignoruj auth routes (zapętlenie)
  if (
    url.pathname === "/login" ||
    url.pathname === "/register" ||
    url.pathname === "/forgot-password" ||
    url.pathname === "/reset-password" ||
    url.pathname.startsWith("/auth/")
  ) {
    return next();
  }

  // Ignoruj public routes
  if (!isProtectedRoute(url.pathname)) {
    return next();
  }

  // Sprawdź sesję dla protected routes
  try {
    const { data, error } = await locals.supabase.auth.getSession();

    if (error || !data.session) {
      // Brak sesji - przekieruj na stronę główną (/)
      // Użytkownik zobaczy AuthPanel i będzie mógł się zalogować
      return redirect("/");
    }

    // Zapisz user do locals dla łatwego dostępu w pages
    locals.user = data.session.user;
    locals.userId = data.session.user.id;
    locals.userEmail = data.session.user.email || undefined;

    return next();
  } catch (error) {
    console.error("Error in pageAuthMiddleware:", error);
    // W razie błędu przekieruj na login
    return redirect("/login");
  }
};
