import { getResumoEvolucao } from "@/lib/data/evolucao";
import { getCicloAtivo } from "@/lib/data/aluno";
import { getTimelineAluno } from "@/lib/data/timeline";
import { getPlanos } from "@/lib/data/planos";
import { TimelineAluno } from "@/components/timeline-aluno";
import { PlanoDoAlunoSelect } from "@/components/plano-do-aluno-select";
import { Card, CardSubtitle, CardTitle } from "@/components/ui/card";
import { EvolutionSummary } from "@/components/evolution-summary";
import { InsightEvolucaoCard } from "@/components/insight-evolucao-card";
import { gerarInsightEvolucao } from "@/lib/insight-evolucao";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  marcarComoPago,
  pedirAtualizacao,
  salvarAnotacoes,
  reenviarConvite,
  cancelarConvite,
  alternarStatusAluno,
} from "@/app/actions/alunos";
import { CONVITE_VALIDADE_DIAS } from "@/lib/constantes";
import { diasDesde, formatDataBR, formatMoedaBR, statusCiclo, statusPagamentoExibicao } from "@/lib/status";
import { AlertTriangle, Bell, FileText, Phone, RefreshCw, XCircle, PauseCircle, PlayCircle } from "lucide-react";
import { buildWhatsappLink, mensagemCobranca } from "@/lib/whatsapp";
import { EditarConfiguracoesForm } from "./editar-configuracoes-form";
import { FotosSolicitadasForm } from "@/components/fotos-solicitadas-form";
import { MedidasSolicitadasForm } from "@/components/medidas-solicitadas-form";
import { ConviteWhatsappButton } from "@/components/convite-whatsapp-button";
import type { Aluno } from "@/lib/types";

export async function GeralTab({ aluno, personalNome }: { aluno: Aluno; personalNome: string }) {
  const [resumo, ciclo, timeline, planos] = await Promise.all([
    getResumoEvolucao(aluno.id),
    getCicloAtivo(aluno.id),
    getTimelineAluno(aluno.id),
    getPlanos(aluno.personal_id),
  ]);
  const planoValor = planos.find((p) => p.id === aluno.plano_id)?.valor ?? null;
  const insight = gerarInsightEvolucao(resumo);

  const diasSemAtualizar = diasDesde(aluno.ultima_atualizacao_medidas);

  return (
    <div className="space-y-4">
      {aluno.status_convite === "pendente" && (() => {
        const diasConvite = diasDesde(aluno.convite_enviado_em) ?? 0;
        const diasParaExpirar = CONVITE_VALIDADE_DIAS - diasConvite;
        const expirado = diasParaExpirar <= 0;
        return (
          <Card className="border-warning/30 bg-warning-soft">
            <div className="mb-2 flex items-center gap-2">
              <AlertTriangle size={16} className="text-warning" />
              <CardTitle>Convite pendente</CardTitle>
            </div>
            <p className="mb-3 text-sm text-muted">
              {expirado
                ? "Esse link de convite já expirou."
                : `Enviado há ${diasConvite} dia${diasConvite === 1 ? "" : "s"} · expira em ${diasParaExpirar} dia${diasParaExpirar === 1 ? "" : "s"}.`}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <ConviteWhatsappButton
                alunoId={aluno.id}
                alunoNome={aluno.nome}
                personalNome={personalNome}
                whatsapp={aluno.whatsapp}
              />
              <form action={reenviarConvite}>
                <input type="hidden" name="alunoId" value={aluno.id} />
                <Button type="submit" size="sm" variant="outline" className="gap-1.5">
                  <RefreshCw size={14} /> Reenviar por e-mail
                </Button>
              </form>
              <form action={cancelarConvite}>
                <input type="hidden" name="alunoId" value={aluno.id} />
                <Button type="submit" size="sm" variant="danger" className="gap-1.5">
                  <XCircle size={14} /> Cancelar convite
                </Button>
              </form>
            </div>
          </Card>
        );
      })()}

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <CardTitle>Resumo de evolução</CardTitle>
          {diasSemAtualizar !== null && diasSemAtualizar > 14 && (
            <span className="text-xs font-medium text-warning">
              {diasSemAtualizar} dias sem atualizar
            </span>
          )}
        </div>
        <EvolutionSummary resumo={resumo} />
        <InsightEvolucaoCard insight={insight} />
        <div className="mt-3 flex flex-wrap gap-2">
          <form action={pedirAtualizacao}>
            <input type="hidden" name="alunoId" value={aluno.id} />
            <Button type="submit" variant="outline" size="sm" className="gap-1.5">
              <Bell size={14} /> Pedir atualização
            </Button>
          </form>
          <a href={`/api/relatorio/${aluno.id}`} target="_blank" rel="noreferrer">
            <Button type="button" variant="outline" size="sm" className="gap-1.5">
              <FileText size={14} /> Gerar relatório PDF
            </Button>
          </a>
        </div>
        {aluno.pedido_atualizacao_enviado_em && (
          <p className="mt-1.5 text-xs text-muted">
            Último pedido enviado em {formatDataBR(aluno.pedido_atualizacao_enviado_em)}
          </p>
        )}
      </Card>

      {aluno.status_convite === "aceito" && (
        <Card className={aluno.status === "inativo" ? "border-muted-2/30 bg-neutral-soft" : undefined}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle>{aluno.status === "inativo" ? "Aluno inativo" : "Aluno ativo"}</CardTitle>
              <CardSubtitle>
                {aluno.status === "inativo"
                  ? "Pausado — não entra nos recebíveis do financeiro, histórico continua salvo."
                  : "Aparece normalmente no financeiro e nos avisos."}
              </CardSubtitle>
            </div>
            <form action={alternarStatusAluno}>
              <input type="hidden" name="alunoId" value={aluno.id} />
              <input type="hidden" name="novoStatus" value={aluno.status === "inativo" ? "ativo" : "inativo"} />
              <Button type="submit" size="sm" variant="outline" className="gap-1.5">
                {aluno.status === "inativo" ? (
                  <>
                    <PlayCircle size={14} /> Reativar
                  </>
                ) : (
                  <>
                    <PauseCircle size={14} /> Inativar
                  </>
                )}
              </Button>
            </form>
          </div>
        </Card>
      )}

      <Card>
        <CardTitle className="mb-3">Contato</CardTitle>
        <p className="text-sm">{aluno.email}</p>
        {aluno.whatsapp && (
          <a
            href={buildWhatsappLink(aluno.whatsapp, `Oi ${aluno.nome.split(" ")[0]}!`)}
            target="_blank"
            className="mt-1 flex items-center gap-1.5 text-sm text-primary"
          >
            <Phone size={14} /> {aluno.whatsapp}
          </a>
        )}
        {aluno.objetivo && <p className="mt-2 text-sm text-muted">Objetivo: {aluno.objetivo}</p>}
        {aluno.restricoes && (
          <p className="mt-1 text-sm text-danger">Restrições/lesões: {aluno.restricoes}</p>
        )}
      </Card>

      <Card>
        <div className="mb-2 flex items-center justify-between">
          <CardTitle>Pagamento</CardTitle>
          <Badge status={statusPagamentoExibicao({ ...aluno, planoValor })} />
        </div>
        <p className="text-sm text-muted">
          {formatMoedaBR(aluno.pagamento_valor)} · vencimento {formatDataBR(aluno.pagamento_vencimento)}
        </p>
        <div className="mt-2 flex items-center gap-2">
          <span className="text-xs text-muted">Plano:</span>
          <PlanoDoAlunoSelect alunoId={aluno.id} planoIdAtual={aluno.plano_id} planos={planos} />
        </div>
        {aluno.pagamento_status === "atrasado" && aluno.whatsapp && (
          <a
            href={buildWhatsappLink(
              aluno.whatsapp,
              mensagemCobranca({ alunoNome: aluno.nome, valor: aluno.pagamento_valor, vencimento: aluno.pagamento_vencimento })
            )}
            target="_blank"
            rel="noreferrer"
            className="mt-2 flex items-center justify-center gap-1.5 rounded-lg bg-danger-soft px-3 py-2 text-xs font-semibold text-danger"
          >
            <Phone size={14} /> Cobrar por WhatsApp
          </a>
        )}
        <details className="mt-3">
          <summary className="cursor-pointer text-sm font-medium text-primary">
            Marcar como pago
          </summary>
          <form action={marcarComoPago} className="mt-3 space-y-2">
            <input type="hidden" name="alunoId" value={aluno.id} />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                step="0.01"
                name="valor"
                placeholder="Valor"
                required
                defaultValue={aluno.pagamento_valor ?? ""}
                className="h-10 rounded-lg border border-border px-2.5 text-sm"
              />
              <input
                type="date"
                name="dataPagamento"
                required
                defaultValue={new Date().toISOString().slice(0, 10)}
                className="h-10 rounded-lg border border-border px-2.5 text-sm"
              />
            </div>
            <select
              name="formaPagamento"
              required
              className="h-10 w-full rounded-lg border border-border px-2.5 text-sm"
            >
              <option value="Pix">Pix</option>
              <option value="Dinheiro">Dinheiro</option>
              <option value="Cartão">Cartão</option>
              <option value="Transferência">Transferência</option>
            </select>
            <input
              type="text"
              name="observacao"
              placeholder="Observação (opcional)"
              className="h-10 w-full rounded-lg border border-border px-2.5 text-sm"
            />
            <Button type="submit" size="sm" className="w-full">
              Confirmar pagamento
            </Button>
          </form>
        </details>
      </Card>

      <Card>
        <CardTitle className="mb-2">Treino atual</CardTitle>
        {ciclo ? (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{ciclo.nome}</p>
              <CardSubtitle>Término previsto: {formatDataBR(ciclo.data_fim)}</CardSubtitle>
            </div>
            <Badge status={statusCiclo(ciclo.data_fim)} />
          </div>
        ) : (
          <p className="text-sm text-muted">Nenhum ciclo ativo.</p>
        )}
      </Card>

      <Card>
        <CardTitle className="mb-3">Linha do tempo</CardTitle>
        <TimelineAluno eventos={timeline} />
      </Card>

      <Card>
        <CardTitle className="mb-2">Avaliações e treino</CardTitle>
        <p className="mb-3 text-sm text-muted">
          Pode ajustar a qualquer momento, mesmo com um ciclo já em andamento.
        </p>
        <EditarConfiguracoesForm
          alunoId={aluno.id}
          anamneseAtivaInicial={aluno.anamnese_ativa}
          bioimpedanciaAtivaInicial={aluno.bioimpedancia_ativa}
          bioimpedanciaFrequenciaInicial={aluno.bioimpedancia_frequencia_dias}
          duracaoCicloInicial={aluno.ciclo_duracao_padrao_semanas}
        />
      </Card>

      <Card>
        <CardTitle className="mb-1">Medidas pedidas</CardTitle>
        <p className="mb-3 text-sm text-muted">
          Peso é sempre pedido. O resto é opcional — tem aluno que só quer se pesar.
        </p>
        <MedidasSolicitadasForm alunoId={aluno.id} atuais={aluno.medidas_solicitadas} />
      </Card>

      <Card>
        <CardTitle className="mb-1">Fotos de progresso solicitadas</CardTitle>
        <p className="mb-3 text-sm text-muted">
          Escolha os ângulos que você quer acompanhar — o aluno vê um bloco pra cada um.
        </p>
        <FotosSolicitadasForm alunoId={aluno.id} atuais={aluno.fotos_solicitadas} />
      </Card>

      <Card>
        <CardTitle className="mb-2">Anotações internas</CardTitle>
        <form action={salvarAnotacoes} className="space-y-2">
          <input type="hidden" name="alunoId" value={aluno.id} />
          <textarea
            name="anotacoes"
            defaultValue={aluno.anotacoes_internas ?? ""}
            placeholder="Histórico de dores, observações de aula..."
            className="h-24 w-full rounded-lg border border-border p-2.5 text-sm"
          />
          <Button type="submit" variant="outline" size="sm">
            Salvar anotações
          </Button>
        </form>
      </Card>
    </div>
  );
}
