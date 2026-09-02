"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Search } from "lucide-react";

export interface ExercicioBiblioteca {
  id: string;
  nome: string;
  grupo_muscular: string;
}

export interface ValoresExercicioAula {
  exercicioId: string;
  tipo: "forca" | "cardio";
  series: number;
  repeticoes: string;
  cargaInicial: number | null;
  descansoSeg: number | null;
  duracaoMin: number | null;
  intensidade: string | null;
  ehAquecimento: boolean;
  combinaProximo: boolean;
}

const PADRAO: ValoresExercicioAula = {
  exercicioId: "",
  tipo: "forca",
  series: 3,
  repeticoes: "10-12",
  cargaInicial: null,
  descansoSeg: 60,
  duracaoMin: null,
  intensidade: "",
  ehAquecimento: false,
  combinaProximo: false,
};

/** Formulário de adicionar/editar um exercício da aula — usado tanto pra
 * criar (sem valoresIniciais) quanto pra editar um já existente. Tem busca +
 * filtro por grupo muscular (a lista crua virava impossível de usar com uma
 * biblioteca grande), tipo força/cardio (campos mudam conforme), e os
 * checkboxes de aquecimento e "combinar com o próximo" (bi-set). */
export function ExercicioAulaForm({
  action,
  hiddenFields,
  biblioteca,
  nomesComTicketRecente,
  valoresIniciais,
  textoSubmit,
  onCancelar,
  mostrarCombinarProximo,
}: {
  action: (formData: FormData) => void;
  hiddenFields: Record<string, string>;
  biblioteca: ExercicioBiblioteca[];
  nomesComTicketRecente: string[];
  valoresIniciais?: ValoresExercicioAula;
  textoSubmit: string;
  onCancelar?: () => void;
  mostrarCombinarProximo: boolean;
}) {
  const v = valoresIniciais ?? PADRAO;
  const exercicioInicial = biblioteca.find((e) => e.id === v.exercicioId) ?? null;

  const [exercicioSelecionado, setExercicioSelecionado] = useState<ExercicioBiblioteca | null>(exercicioInicial);
  const [busca, setBusca] = useState("");
  const [grupoAtivo, setGrupoAtivo] = useState<string | null>(null);
  const [tipo, setTipo] = useState<"forca" | "cardio">(v.tipo);

  const grupos = useMemo(() => Array.from(new Set(biblioteca.map((e) => e.grupo_muscular))).sort(), [biblioteca]);

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return biblioteca.filter((e) => {
      if (grupoAtivo && e.grupo_muscular !== grupoAtivo) return false;
      if (termo && !e.nome.toLowerCase().includes(termo)) return false;
      return true;
    });
  }, [biblioteca, busca, grupoAtivo]);

  const ticketsSet = useMemo(() => new Set(nomesComTicketRecente), [nomesComTicketRecente]);

  return (
    <form action={action} className="mt-2 space-y-3 rounded-lg border border-border p-3">
      {Object.entries(hiddenFields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <input type="hidden" name="exercicioId" value={exercicioSelecionado?.id ?? ""} />

      {exercicioSelecionado ? (
        <div className="flex items-center justify-between rounded-lg bg-primary-soft px-3 py-2">
          <span className="text-sm font-medium text-primary-dark">
            {ticketsSet.has(exercicioSelecionado.nome) && (
              <AlertTriangle size={13} className="mr-1 inline text-warning" />
            )}
            {exercicioSelecionado.nome}
            <span className="ml-1 text-xs text-primary-dark/70">({exercicioSelecionado.grupo_muscular})</span>
          </span>
          <button
            type="button"
            onClick={() => setExercicioSelecionado(null)}
            className="text-xs font-medium text-primary-dark underline"
          >
            Trocar
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-2" />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar exercício..."
              className="h-9 w-full rounded-lg border border-border pl-8 pr-2 text-sm"
            />
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-0.5">
            <button
              type="button"
              onClick={() => setGrupoAtivo(null)}
              className={`shrink-0 rounded-pill border px-2.5 py-1 text-xs font-medium ${!grupoAtivo ? "border-primary bg-primary-soft text-primary-dark" : "border-border text-muted"}`}
            >
              Todos
            </button>
            {grupos.map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setGrupoAtivo(g)}
                className={`shrink-0 rounded-pill border px-2.5 py-1 text-xs font-medium ${grupoAtivo === g ? "border-primary bg-primary-soft text-primary-dark" : "border-border text-muted"}`}
              >
                {g}
              </button>
            ))}
          </div>
          <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-border p-1.5">
            {filtrados.map((ex) => (
              <button
                key={ex.id}
                type="button"
                onClick={() => setExercicioSelecionado(ex)}
                className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm hover:bg-neutral-soft"
              >
                <span className="flex items-center gap-1.5">
                  {ticketsSet.has(ex.nome) && <AlertTriangle size={13} className="shrink-0 text-warning" />}
                  {ex.nome}
                </span>
                <span className="text-xs text-muted">{ex.grupo_muscular}</span>
              </button>
            ))}
            {filtrados.length === 0 && (
              <p className="px-2 py-3 text-center text-xs text-muted">Nenhum exercício encontrado.</p>
            )}
          </div>
        </div>
      )}

      <div className="flex gap-1.5">
        <button
          type="button"
          onClick={() => setTipo("forca")}
          className={`flex-1 rounded-lg border py-1.5 text-xs font-medium ${tipo === "forca" ? "border-primary bg-primary-soft text-primary-dark" : "border-border text-muted"}`}
        >
          Força
        </button>
        <button
          type="button"
          onClick={() => setTipo("cardio")}
          className={`flex-1 rounded-lg border py-1.5 text-xs font-medium ${tipo === "cardio" ? "border-primary bg-primary-soft text-primary-dark" : "border-border text-muted"}`}
        >
          Cardio
        </button>
      </div>
      <input type="hidden" name="tipo" value={tipo} />

      {tipo === "forca" ? (
        <div className="grid grid-cols-4 gap-2">
          <input
            name="series"
            type="number"
            defaultValue={v.series}
            placeholder="Séries"
            className="h-9 rounded-lg border border-border px-2 text-sm"
          />
          <input
            name="repeticoes"
            defaultValue={v.repeticoes}
            placeholder="Reps"
            className="h-9 rounded-lg border border-border px-2 text-sm"
          />
          <input
            name="cargaInicial"
            type="number"
            step="0.5"
            defaultValue={v.cargaInicial ?? ""}
            placeholder="Carga"
            className="h-9 rounded-lg border border-border px-2 text-sm"
          />
          <input
            name="descansoSeg"
            type="number"
            defaultValue={v.descansoSeg ?? 60}
            placeholder="Descanso"
            className="h-9 rounded-lg border border-border px-2 text-sm"
          />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <input
            name="duracaoMin"
            type="number"
            defaultValue={v.duracaoMin ?? ""}
            placeholder="Duração (min)"
            className="h-9 rounded-lg border border-border px-2 text-sm"
          />
          <input
            name="intensidade"
            defaultValue={v.intensidade ?? ""}
            placeholder="Intensidade (ex: leve, 6km/h)"
            className="h-9 rounded-lg border border-border px-2 text-sm"
          />
        </div>
      )}

      <div className="flex flex-wrap gap-3 text-xs">
        <label className="flex items-center gap-1.5">
          <input type="checkbox" name="ehAquecimento" defaultChecked={v.ehAquecimento} className="h-4 w-4" />
          Aquecimento
        </label>
        {mostrarCombinarProximo && (
          <label className="flex items-center gap-1.5">
            <input type="checkbox" name="combinaProximo" defaultChecked={v.combinaProximo} className="h-4 w-4" />
            Combinar com o próximo (bi-set)
          </label>
        )}
      </div>

      <div className="flex gap-2">
        {onCancelar && (
          <Button type="button" variant="outline" size="sm" className="flex-1" onClick={onCancelar}>
            Cancelar
          </Button>
        )}
        <Button type="submit" size="sm" className="flex-1" disabled={!exercicioSelecionado}>
          {textoSubmit}
        </Button>
      </div>
    </form>
  );
}
