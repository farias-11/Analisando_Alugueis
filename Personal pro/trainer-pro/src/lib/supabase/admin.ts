import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Cliente com service role — ignora RLS. Uso restrito a Server Actions que
// precisam de privilégio administrativo (convidar aluno via Supabase Auth,
// vincular auth_user_id ao aceitar o convite). NUNCA importe isto em
// código de cliente.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
