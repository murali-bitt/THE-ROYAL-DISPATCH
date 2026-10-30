import { z } from "zod";

/**
 * Public configuration. NEXT_PUBLIC_* values are inlined at build time, so
 * they must be referenced literally here. Only the publishable (anon) key is
 * ever read — the app never needs a service-role key.
 */
const publicEnvSchema = z.object({
  url: z.url().optional(),
  key: z.string().min(20).optional(),
});

const parsed = publicEnvSchema.safeParse({
  url: process.env.NEXT_PUBLIC_SUPABASE_URL || undefined,
  key:
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    undefined,
});

if (!parsed.success && typeof window === "undefined") {
  console.warn(
    "[royal-dispatch] Supabase environment variables are malformed; running in local demo mode.",
  );
}

const values = parsed.success ? parsed.data : {};

export const supabaseConfig =
  values.url && values.key ? { url: values.url, key: values.key } : null;

export const isSupabaseConfigured = supabaseConfig !== null;
