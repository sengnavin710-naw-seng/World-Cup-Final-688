export function readConfig() {
  return {
    port: Number(process.env.PORT ?? 3001),
    supabaseUrl: process.env.SUPABASE_URL ?? "",
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  };
}
