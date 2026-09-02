import { createClient } from "@/lib/supabase/server";
import { Card, CardTitle } from "@/components/ui/card";
import { formatDataBR } from "@/lib/status";
import { TrendingDown, TrendingUp } from "lucide-react";

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
] as const;

function rotuloMes(dia: string) {
  const d = new Date(dia + "T00:00:00");
  return `${MESES[d.getMonth()]} ${d.getFullYear()}`;
}

/** Resume as séries de um exercício numa sessão: quando carga e reps se
 * repetem (o caso comum), vira "4×8 · 30kg" em vez de listar série por série —
 * só cai pro detalhe quando alguma série realmente variou. */
function resumoSeries(series: { carga: number | null; repeticoes: number | null; serie: number }[]) {
  const ordenadas = series.slice().sort((a, b) => a.serie - b.serie);
  const cargas = new Set(ordenadas.map((s) => s.carga));
  const reps = new Set(ordenadas.map((s) => s.repeticoes));
  if (cargas.size === 1 && reps.size === 1) {
    const carga = ordenadas[0].carga;
    const rep = ordenadas[0].repeticoes;
    return `${ordenadas.length}×${rep ?? "—"}${carga !== null ? ` · ${carga}kg` : ""}`;
  }
  return ordenadas.map((sr) => `${sr.carga ?? "—"}kg×${sr.repeticoes ?? "—"}`).join(", ");
}

type LinhaExecucao = {
  data: string;
  carga: number | null;
  repeticoes: number | null;
  serie_numero: number;
  aula_exercicios: { aula_id: string; aulas: { nome: string } | null; exercicios: { nome: string } | null } | null;
};

interface Sessao {
  chave: string;
  aulaId: string;
  aulaNome: string;
  dia: string;
  exercicios: Map<string, { carga: number | null; repeticoes: number | null; serie: number }[]>;
  cargas: number[];
}

export async function HistoricoTab({ alunoId }: { alunoId: string }) {
  const supabase = await createClient();
  const { data: ciclos } = await supabase
    .from("ciclos")
    .select("*")
    .eq("aluno_id", alunoId)
    .order("data_inicio", { ascending: false });

  const { data: execucoes } = await supabase
    .from("execucoes")
    .select("data, carga, repeticoes, serie_numero, aula_exercicios(aula_id, aulas(nome), exercicios(nome))")
    .eq("aluno_id", alunoId)
    .order("data", { ascending: false })
    .limit(300);

  const linhas = (execucoes ?? []) as unknown as LinhaExecucao[];

  // agrupa por sessão real de treino: mesma aula, mesmo dia
  const sessoesPorChave = new Map<string, Sessao>();
  for (const l of linhas) {
    const aulaId = l.aula_exercicios?.aula_id;
    const aulaNome = l.aula_exercicios?.aulas?.nome;
    const exercicioNome = l.aula_exercicios?.exercicios?.nome;
    if (!aulaId || !aulaNome || !exercicioNome) continue;
    const dia = l.data.slice(0, 10);
    const chave = `${aulaId}_${dia}`;

    const sessao: Sessao = sessoesPorChave.get(chave) ?? {
      chave,
      aulaId,
      aulaNome,
      dia,
      exercicios: new Map(),
      cargas: [],
    };
    const lista = sessao.exercicios.get(exercicioNome) ?? [];
    lista.push({ carga: l.carga, repeticoes: l.repeticoes, serie: l.serie_numero });
    sessao.exercicios.set(exercicioNome, lista);
    if (l.carga !== null) sessao.cargas.push(l.carga);
    sessoesPorChave.set(chave, sessao);
  }

  const sessoes = Array.from(sessoesPorChave.values()).sort((a, b) => (a.dia < b.dia ? 1 : -1));

  // agrupa por mês pra não virar uma lista infinita indiferenciada com meses
  // de histórico — cada grupo vira uma seção com cabeçalho
  const sessoesPorMes = new Map<string, typeof sessoes>();
  for (const s of sessoes) {
    const chaveMes = s.dia.slice(0, 7);
    const grupo = sessoesPorMes.get(chaveMes) ?? [];
    grupo.push(s);
    sessoesPorMes.set(chaveMes, grupo);
  }

  // carga média por sessão, comparada com a sessão anterior da MESMA aula
  // (não a linha anterior da lista, que pode ser de uma aula diferente)
  const ultimaCargaPorAula = new Map<string, number>();
  const sessoesOrdemCronologica = [...sessoes].reverse();
  const deltaPorChave = new Map<string, number | null>();
  for (const s of sessoesOrdemCronologica) {
    const media = s.cargas.length ? s.cargas.reduce((sum, c) => sum + c, 0) / s.cargas.length : null;
    const anterior = ultimaCargaPorAula.get(s.aulaId);
    if (media !== null && anterior !== undefined && anterior > 0) {
      deltaPorChave.set(s.chave, Math.round(((media - anterior) / anterior) * 100));
    } else {
      deltaPorChave.set(s.chave, null);
    }
    if (media !== null) ultimaCargaPorAula.set(s.aulaId, media);
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardTitle className="mb-3">Ciclos de treino</CardTitle>
        <div className="space-y-2">
          {(ciclos ?? []).map((c) => (
            <div key={c.id} className="flex items-center justify-between border-b border-border py-2 text-sm last:border-0">
              <span>{c.nome}</span>
              <span className="text-muted">
                {formatDataBR(c.data_inicio)} — {formatDataBR(c.data_fim)}
              </span>
            </div>
          ))}
          {(!ciclos || ciclos.length === 0) && <p className="text-sm text-muted">Nenhum ciclo registrado.</p>}
        </div>
      </Card>

      <Card>
        <CardTitle className="mb-3">Treinos realizados</CardTitle>
        <div className="space-y-4">
          {Array.from(sessoesPorMes.entries()).map(([chaveMes, sessoesDoMes]) => (
            <div key={chaveMes}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-2">
                {rotuloMes(sessoesDoMes[0].dia)}
              </p>
              <div className="space-y-3">
                {sessoesDoMes.map((s) => {
                  const delta = deltaPorChave.get(s.chave);
                  return (
                    <div key={s.chave} className="rounded-xl bg-neutral-soft p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold">{s.aulaNome}</p>
                          <p className="text-xs text-muted">
                            {formatDataBR(s.dia)} · {s.exercicios.size} exercícios
                          </p>
                        </div>
                        {delta !== null && delta !== undefined && delta !== 0 && (
                          <span
                            className={`flex shrink-0 items-center gap-1 rounded-pill px-2 py-0.5 text-xs font-semibold ${
                              delta > 0 ? "bg-success-soft text-success" : "bg-danger-soft text-danger"
                            }`}
                          >
                            {delta > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                            {delta > 0 ? "+" : ""}
                            {delta}% carga
                          </span>
                        )}
                      </div>
                      <div className="mt-2 space-y-1 border-t border-border pt-2">
                        {Array.from(s.exercicios.entries()).map(([nome, series]) => (
                          <div key={nome} className="flex items-center justify-between text-xs">
                            <span className="text-foreground">{nome}</span>
                            <span className="font-medium text-muted">{resumoSeries(series)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          {sessoes.length === 0 && <p className="text-sm text-muted">Nenhuma execução registrada ainda.</p>}
        </div>
      </Card>
    </div>
  );
}
