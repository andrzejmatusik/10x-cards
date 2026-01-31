/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Supabase Server-Side Configuration
 * Używa cookies do przechowywania sesji dla SSR
 */

import { createServerClient } from "@supabase/ssr";
import type { AstroCookies } from "astro";
import type { Database } from "@/db/database.types";

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL || import.meta.env.SUPABASE_URL;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_KEY || import.meta.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase environment variables. " + "Make sure PUBLIC_SUPABASE_URL and PUBLIC_SUPABASE_KEY are set in .env"
  );
}

/**
 * Tworzy Supabase client dla server-side z obsługą cookies
 * Używane w middleware i API routes
 */
export function createSupabaseServerClient(cookies: AstroCookies) {
  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(key: string) {
        return cookies.get(key)?.value;
      },
      set(key: string, value: string, options: any) {
        cookies.set(key, value, options);
      },
      remove(key: string, options: any) {
        cookies.delete(key, options);
      },
    },
  });
}
