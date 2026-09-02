import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Plano } from "@/lib/types";

export async function getPlanos(personalId: string): Promise<Plano[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("planos").select("*").eq("personal_id", personalId).order("valor");
  return (data ?? []) as Plano[];
}
