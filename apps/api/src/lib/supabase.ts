import { createClient } from "@supabase/supabase-js";
import { readConfig } from "../config";

export function getSupabaseClient() {
  const config = readConfig();
  if (!config.supabaseUrl || !config.supabaseServiceRoleKey) {
    return null;
  }

  return createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
    },
  });
}
