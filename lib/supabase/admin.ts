import { createClient } from "@supabase/supabase-js";

export function getSupabaseServerConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

  return {
    url,
    secretKey
  };
}

export function supabaseServerConfigIsReady() {
  const { url, secretKey } = getSupabaseServerConfig();

  return Boolean(url && secretKey);
}

export function createSupabaseAdminClient() {
  const { url, secretKey } = getSupabaseServerConfig();

  if (!url || !secretKey) {
    throw new Error("Supabase server configuration is missing.");
  }

  return createClient(url, secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

