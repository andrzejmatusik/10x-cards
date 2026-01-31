import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "../db/database.types.ts";

// Dla client-side (browser) używamy PUBLIC_ prefix
const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase environment variables. " + "Make sure PUBLIC_SUPABASE_URL and PUBLIC_SUPABASE_KEY are set in .env"
  );
}

/**
 * Browser-side Supabase client
 * Używa @supabase/ssr dla lepszej synchronizacji z serwerem
 * Automatycznie synchronizuje sesję z cookies ustawionymi przez serwer
 */
export const supabaseClient = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
