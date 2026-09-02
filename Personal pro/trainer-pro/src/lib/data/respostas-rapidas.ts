import { createClient } from "@/lib/supabase/server";
import type { RespostaRapida } from "@/lib/types";

// enquanto o personal não cadastra as próprias respostas, mostra 3 exemplos
// prontos como sugestão — evita tela vazia sem precisar de uma migração de
// seed retroativa pras contas já existentes
const EXEMPLOS_PADRAO = [
  "Ajustei a carga/execução com você por aqui, pode seguir o treino normalmente.",
  "Vamos trocar esse exercício por um similar. Já atualizei no seu treino.",
  "Isso pode ser normal no início, mas se a dor persistir nas próximas sessões me avisa que a gente reavalia.",
];

export async function getRespostasRapidas(personalId: string): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("respostas_rapidas")
    .select("*")
    .eq("personal_id", personalId)
    .order("ordem", { ascending: true });

  const respostas = (data ?? []) as RespostaRapida[];
  if (respostas.length > 0) return respostas.map((r) => r.texto);
  return EXEMPLOS_PADRAO;
}

export async function getRespostasRapidasCompletas(personalId: string): Promise<RespostaRapida[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("respostas_rapidas")
    .select("*")
    .eq("personal_id", personalId)
    .order("ordem", { ascending: true });

  return (data ?? []) as RespostaRapida[];
}
