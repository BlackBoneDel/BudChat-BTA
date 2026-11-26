import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Configuración via variables de entorno (Vite: VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)
// En Cloudflare Pages se definen en el dashboard o en vite.config / .env
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!url || !anonKey) {
  console.warn(
    "[budsin-chat] Falta VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY. " +
      "Define ambos en .env.local o en el dashboard de Cloudflare Pages."
  );
}

export const supabase: SupabaseClient = createClient(url || "", anonKey || "", {
  auth: { persistSession: true, autoRefreshToken: true },
});

// Helper asíncrono para obtener el uid del usuario actual
export async function getCurrentUid(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

export const CONFIG = {
  supabaseUrl: url || "",
  supabaseAnonKey: anonKey || "",
};
