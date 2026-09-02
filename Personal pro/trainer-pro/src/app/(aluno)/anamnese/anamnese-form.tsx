"use client";

import { useActionState, useState } from "react";
import { enviarAnamnese } from "@/app/actions/anamnese";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { Card, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Anamnese } from "@/lib/types";

const DOENCAS_OPCOES = [
  "Hipertensão",
  "Diabetes",
  "Problema cardíaco",
  "Colesterol alto",
  "Asma / problema respiratório",
  "Nenhuma",
];

const LESOES_OPCOES = ["Joelho", "Ombro", "Coluna / lombar", "Quadril", "Tornozelo", "Punho / mão", "Nenhuma"];

const PROFISSAO_OPCOES = [
  "Estudante",
  "CLT / emprego formal",
  "Autônomo(a)",
  "Empresário(a)",
  "Do lar",
  "Aposentado(a)",
];

const MEDICAMENTOS_OPCOES = [
  "Pressão alta",
  "Diabetes / insulina",
  "Anticoncepcional / hormonal",
  "Ansiolítico / antidepressivo",
  "Anti-inflamatório contínuo",
  "Outro",
];

const CIRURGIAS_OPCOES = ["Joelho", "Ombro", "Coluna", "Abdominal (ex: apendicite, vesícula)", "Cesárea", "Outra"];

const FISIOTERAPIA_OPCOES = ["Joelho", "Ombro", "Coluna / lombar", "Quadril", "Tornozelo", "Punho / mão", "Outro motivo"];

function Chip({
  label,
  name,
  checked,
  onToggle,
}: {
  label: string;
  name: string;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm",
        checked ? "border-primary bg-primary-soft text-primary-dark" : "border-border text-foreground"
      )}
    >
      <input type="checkbox" name={name} value={label} checked={checked} onChange={onToggle} className="hidden" />
      {label}
    </label>
  );
}

function CampoSimNao({
  label,
  name,
  hint,
  valor,
  onChange,
  opcoes,
  opcoesName,
  opcoesSelecionadas,
  onToggleOpcao,
  detalheName,
  detalheDefault,
  detalhePlaceholder,
}: {
  label: string;
  name: string;
  hint?: string;
  valor: string;
  onChange: (v: string) => void;
  opcoes?: string[];
  opcoesName?: string;
  opcoesSelecionadas?: string[];
  onToggleOpcao?: (label: string) => void;
  detalheName: string;
  detalheDefault?: string;
  detalhePlaceholder: string;
}) {
  return (
    <>
      <Field label={label} hint={hint}>
        <Select name={name} value={valor} onChange={(e) => onChange(e.target.value)}>
          <option value="nao">Não</option>
          <option value="sim">Sim</option>
        </Select>
      </Field>
      {valor === "sim" && opcoes && opcoesName && opcoesSelecionadas && onToggleOpcao && (
        <Field label="Qual(is)?">
          <div className="flex flex-wrap gap-2">
            {opcoes.map((op) => (
              <Chip key={op} label={op} name={opcoesName} checked={opcoesSelecionadas.includes(op)} onToggle={() => onToggleOpcao(op)} />
            ))}
          </div>
        </Field>
      )}
      {valor === "sim" && (
        <Field label={opcoes ? "Detalhe adicional (opcional)" : "Detalhe"}>
          <Textarea name={detalheName} defaultValue={detalheDefault} placeholder={detalhePlaceholder} />
        </Field>
      )}
    </>
  );
}

export function AnamneseForm({ anamnese }: { anamnese: Anamnese | null }) {
  const [state, formAction, pending] = useActionState(enviarAnamnese, undefined);
  const r = (anamnese?.respostas ?? {}) as Record<string, string | string[]>;
  const asArray = (v: string | string[] | undefined) => (Array.isArray(v) ? v : []);
  const asString = (v: string | string[] | undefined) => (typeof v === "string" ? v : "");

  const [doencas, setDoencas] = useState<string[]>(asArray(r.doencas));
  const [lesoes, setLesoes] = useState<string[]>(asArray(r.lesoes_dores));
  const [medicamentosUsa, setMedicamentosUsa] = useState(asString(r.medicamentos_usa) || "nao");
  const [medicamentosTipos, setMedicamentosTipos] = useState<string[]>(asArray(r.medicamentos_tipos));
  const [cirurgiasTeve, setCirurgiasTeve] = useState(asString(r.cirurgias_teve) || "nao");
  const [cirurgiasTipos, setCirurgiasTipos] = useState<string[]>(asArray(r.cirurgias_tipos));
  const [fisioterapiaFez, setFisioterapiaFez] = useState(asString(r.fisioterapia_fez) || "nao");
  const [fisioterapiaTipos, setFisioterapiaTipos] = useState<string[]>(asArray(r.fisioterapia_tipos));
  const profissaoSalva = asString(r.profissao);
  const [profissao, setProfissao] = useState(
    !profissaoSalva ? "" : PROFISSAO_OPCOES.includes(profissaoSalva) ? profissaoSalva : "Outra"
  );

  function toggle(lista: string[], setLista: (v: string[]) => void, label: string) {
    setLista(lista.includes(label) ? lista.filter((l) => l !== label) : [...lista, label]);
  }

  return (
    <form action={formAction} className="space-y-4">
      <Card>
        <CardTitle className="mb-3">1. Dados gerais</CardTitle>
        <div className="space-y-3">
          <Field label="Idade">
            <Input name="idade" type="number" min={0} defaultValue={asString(r.idade)} required />
          </Field>
          <Field label="Profissão">
            <Select name="profissao" value={profissao} onChange={(e) => setProfissao(e.target.value)}>
              <option value="">Selecione</option>
              {PROFISSAO_OPCOES.map((op) => (
                <option key={op} value={op}>
                  {op}
                </option>
              ))}
              <option value="Outra">Outra</option>
            </Select>
          </Field>
          {profissao === "Outra" && (
            <Field label="Qual?">
              <Input name="profissao_outra" defaultValue={PROFISSAO_OPCOES.includes(profissaoSalva) ? "" : profissaoSalva} />
            </Field>
          )}
          <Field label="Nível de atividade física atual">
            <Select name="nivel_atividade" defaultValue={asString(r.nivel_atividade)} required>
              <option value="">Selecione</option>
              <option value="sedentario">Sedentário</option>
              <option value="leve">Leve</option>
              <option value="moderado">Moderado</option>
              <option value="intenso">Intenso</option>
            </Select>
          </Field>
        </div>
      </Card>

      <Card>
        <CardTitle className="mb-3">2. Histórico de saúde</CardTitle>
        <div className="space-y-3">
          <Field label="Doenças diagnosticadas">
            <div className="flex flex-wrap gap-2">
              {DOENCAS_OPCOES.map((op) => (
                <Chip key={op} label={op} name="doencas" checked={doencas.includes(op)} onToggle={() => toggle(doencas, setDoencas, op)} />
              ))}
            </div>
          </Field>
          {!doencas.includes("Nenhuma") && (
            <Field label="Outra doença (opcional)">
              <Input name="doencas_outra" defaultValue={asString(r.doencas_outra)} />
            </Field>
          )}

          <CampoSimNao
            label="Usa medicamento de uso contínuo?"
            name="medicamentos_usa"
            valor={medicamentosUsa}
            onChange={setMedicamentosUsa}
            opcoes={MEDICAMENTOS_OPCOES}
            opcoesName="medicamentos_tipos"
            opcoesSelecionadas={medicamentosTipos}
            onToggleOpcao={(op) => toggle(medicamentosTipos, setMedicamentosTipos, op)}
            detalheName="medicamentos_detalhe"
            detalheDefault={asString(r.medicamentos_detalhe)}
            detalhePlaceholder="Nome do medicamento, se quiser detalhar"
          />
          <CampoSimNao
            label="Já fez alguma cirurgia?"
            name="cirurgias_teve"
            valor={cirurgiasTeve}
            onChange={setCirurgiasTeve}
            opcoes={CIRURGIAS_OPCOES}
            opcoesName="cirurgias_tipos"
            opcoesSelecionadas={cirurgiasTipos}
            onToggleOpcao={(op) => toggle(cirurgiasTipos, setCirurgiasTipos, op)}
            detalheName="cirurgias_detalhe"
            detalheDefault={asString(r.cirurgias_detalhe)}
            detalhePlaceholder="Quando foi, se quiser detalhar"
          />
        </div>
      </Card>

      <Card>
        <CardTitle className="mb-3">3. Lesões e dores</CardTitle>
        <div className="space-y-3">
          <Field label="Região com lesão ou dor atual/recorrente">
            <div className="flex flex-wrap gap-2">
              {LESOES_OPCOES.map((op) => (
                <Chip key={op} label={op} name="lesoes_dores" checked={lesoes.includes(op)} onToggle={() => toggle(lesoes, setLesoes, op)} />
              ))}
            </div>
          </Field>
          {!lesoes.includes("Nenhuma") && (
            <Field label="Detalhe (opcional)" hint="Onde dói ou já doeu, e em que situação.">
              <Textarea name="lesoes_dores_outra" defaultValue={asString(r.lesoes_dores_outra)} />
            </Field>
          )}
          <CampoSimNao
            label="Já fez fisioterapia?"
            name="fisioterapia_fez"
            valor={fisioterapiaFez}
            onChange={setFisioterapiaFez}
            opcoes={FISIOTERAPIA_OPCOES}
            opcoesName="fisioterapia_tipos"
            opcoesSelecionadas={fisioterapiaTipos}
            onToggleOpcao={(op) => toggle(fisioterapiaTipos, setFisioterapiaTipos, op)}
            detalheName="fisioterapia_detalhe"
            detalheDefault={asString(r.fisioterapia_detalhe)}
            detalhePlaceholder="Por qual motivo?"
          />
        </div>
      </Card>

      <Card>
        <CardTitle className="mb-3">4. Hábitos</CardTitle>
        <div className="space-y-3">
          <Field label="Fumante?">
            <Select name="fumante" defaultValue={asString(r.fumante)}>
              <option value="nao">Não</option>
              <option value="sim">Sim</option>
              <option value="ex_fumante">Ex-fumante</option>
            </Select>
          </Field>
          <Field label="Consumo de álcool">
            <Select name="alcool" defaultValue={asString(r.alcool)}>
              <option value="nao">Não bebe</option>
              <option value="social">Socialmente</option>
              <option value="frequente">Frequentemente</option>
            </Select>
          </Field>
          <Field label="Qualidade do sono">
            <Select name="sono" defaultValue={asString(r.sono)}>
              <option value="boa">Boa</option>
              <option value="regular">Regular</option>
              <option value="ruim">Ruim</option>
            </Select>
          </Field>
          <Field label="Nível de estresse">
            <Select name="estresse" defaultValue={asString(r.estresse)}>
              <option value="baixo">Baixo</option>
              <option value="medio">Médio</option>
              <option value="alto">Alto</option>
            </Select>
          </Field>
        </div>
      </Card>

      <Card>
        <CardTitle className="mb-3">5. Objetivos e experiência</CardTitle>
        <div className="space-y-3">
          <Field label="Objetivo principal">
            <Select name="objetivo_principal" defaultValue={asString(r.objetivo_principal)} required>
              <option value="">Selecione</option>
              <option value="emagrecimento">Emagrecimento</option>
              <option value="hipertrofia">Hipertrofia</option>
              <option value="condicionamento">Condicionamento</option>
              <option value="saude_geral">Saúde geral</option>
            </Select>
          </Field>
          <Field label="Experiência prévia com treino">
            <Select name="experiencia_previa" defaultValue={asString(r.experiencia_previa)}>
              <option value="nenhuma">Nenhuma</option>
              <option value="menos_6_meses">Menos de 6 meses</option>
              <option value="6_meses_2_anos">De 6 meses a 2 anos</option>
              <option value="mais_2_anos">Mais de 2 anos</option>
            </Select>
          </Field>
          <Field label="Detalhe (opcional)">
            <Textarea name="experiencia_previa_detalhe" defaultValue={asString(r.experiencia_previa_detalhe)} />
          </Field>
        </div>
      </Card>

      <Card>
        <CardTitle className="mb-3">6. Observações</CardTitle>
        <Textarea name="observacoes" placeholder="Observações livres" defaultValue={asString(r.observacoes)} />
      </Card>

      {state?.error ? <p className="text-sm text-danger">{state.error}</p> : null}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Enviando..." : "Enviar"}
      </Button>
    </form>
  );
}
