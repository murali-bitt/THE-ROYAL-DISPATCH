"use client";

import { createBrowserClient } from "@supabase/ssr";
import { supabaseConfig } from "@/lib/env";

/** Browser client — used only for sign-in / sign-out. Data flows through /api. */
export function createSupabaseBrowserClient() {
  if (!supabaseConfig) throw new Error("Supabase is not configured.");
  return createBrowserClient(supabaseConfig.url, supabaseConfig.key);
}
