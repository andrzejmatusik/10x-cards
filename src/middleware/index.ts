import { sequence } from "astro:middleware";
import { defineMiddleware } from "astro:middleware";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { authMiddleware } from "./auth.ts";
import { pageAuthMiddleware } from "./page-auth.ts";
import { rateLimitMiddleware } from "./rate-limit.ts";

/**
 * Middleware to inject Supabase SSR client into context.locals
 * Tworzy nowy client dla każdego request z dostępem do cookies
 */
const supabaseMiddleware = defineMiddleware((context, next) => {
  // Twórz SSR client z dostępem do cookies dla każdego request
  context.locals.supabase = createSupabaseServerClient(context.cookies);
  return next();
});

/**
 * Combined middleware pipeline
 * 1. Inject Supabase SSR client (z cookies)
 * 2. Check page authentication (for protected pages)
 * 3. Authenticate API requests (for /api routes)
 * 4. Apply rate limiting (for /api routes)
 */
export const onRequest = sequence(supabaseMiddleware, pageAuthMiddleware, authMiddleware, rateLimitMiddleware);
