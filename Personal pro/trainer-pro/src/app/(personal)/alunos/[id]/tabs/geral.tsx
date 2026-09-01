import { getResumoEvolucao } from "@/lib/data/evolucao";
import { getCicloAtivo } from "@/lib/data/aluno";
import { Card, CardSubtitle, CardTitle } from "@/components/ui/card";
import { EvolutionSummary } from "@/components/evolution-summary";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { marcarComoPago, pedirAtualizacao, salvarAnotacoes } from "@/app/actions/alunos";
import { diasDesde, formatDataBR, formatMoedaBR, statusCiclo, statusPagamentoExibicao } from "@/lib/status";
import { Bell, Phone } from "lucide-react";
import { buildWhatsappLink } from "@/lib/whatsapp";
import type { Aluno } from "@/lib/types";

export async function GeralTab({ aluno }: { aluno: Aluno }) {
  const resumo = await getResumoEvolucao(aluno.id);
  const ciclo = await getCicloAtivo(aluno.id);

  const diasSemAtualizar = diasDesde(aluno.ultima_atualizacao_medidas);

  return (
    <div className="space-y-4">
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
        <form action={pedirAtualizacao} className="mt-3">
          <input type="hidden" name="alunoId" value={aluno.id} />
          <Button type="submit" variant="outline" size="sm" className="gap-1.5">
            <Bell size={14} /> Pedir atualização
          </Button>
        </form>
        {aluno.pedido_atualizacao_enviado_em && (
          <p className="mt-1.5 text-xs text-muted">
            Último pedido enviado em {formatDataBR(aluno.pedido_atualizacao_enviado_em)}
          </p>
        )}
      </Card>

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
          <Badge status={statusPagamentoExibicao(aluno)} />
        </div>
        <p className="text-sm text-muted">
          {formatMoedaBR(aluno.pagamento_valor)} · vencimento {formatDataBR(aluno.pagamento_vencimento)}
        </p>
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
