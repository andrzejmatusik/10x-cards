import { sequence } from "astro:middleware";
import { defineMiddleware } from "astro:middleware";

import { supabaseClient } from "../db/supabase.client.ts";
import { authMiddleware } from "./auth.ts";
import { rateLimitMiddleware } from "./rate-limit.ts";

/**
 * Middleware to inject Supabase client into context.locals
 */
const supabaseMiddleware = defineMiddleware((context, next) => {
  context.locals.supabase = supabaseClient;
  return next();
});

/**
 * Combined middleware pipeline
 * 1. Inject Supabase client
 * 2. Authenticate requests (for /api routes)
 * 3. Apply rate limiting (for /api routes)
 */
export const onRequest = sequence(supabaseMiddleware, authMiddleware, rateLimitMiddleware);
