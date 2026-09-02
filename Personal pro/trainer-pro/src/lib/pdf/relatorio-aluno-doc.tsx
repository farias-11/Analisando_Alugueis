import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { RelatorioAlunoData } from "@/lib/data/relatorio";
import { formatDataBR, formatMoedaBR } from "@/lib/status";

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 10, fontFamily: "Helvetica", color: "#1a1a1a" },
  header: { marginBottom: 16 },
  titulo: { fontSize: 18, fontFamily: "Helvetica-Bold", marginBottom: 2 },
  subtitulo: { fontSize: 10, color: "#666666" },
  secao: { marginBottom: 14 },
  secaoTitulo: { fontSize: 12, fontFamily: "Helvetica-Bold", marginBottom: 6, borderBottom: "1 solid #dddddd", paddingBottom: 3 },
  linha: { flexDirection: "row", justifyContent: "space-between", marginBottom: 3 },
  label: { color: "#666666" },
  cardsRow: { flexDirection: "row", gap: 10, marginBottom: 4 },
  card: { flex: 1, backgroundColor: "#f5f5f5", borderRadius: 6, padding: 8 },
  cardValor: { fontSize: 14, fontFamily: "Helvetica-Bold" },
  cardLabel: { fontSize: 8, color: "#666666", marginTop: 2 },
  aulaBloco: { marginBottom: 8 },
  aulaNome: { fontFamily: "Helvetica-Bold", marginBottom: 3 },
  exercicioLinha: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2, borderBottom: "0.5 solid #eeeeee" },
  rodape: { position: "absolute", bottom: 24, left: 32, right: 32, fontSize: 8, color: "#999999", textAlign: "center" },
});

function formatarSinal(v: number | null, casas = 1) {
  if (v === null) return "—";
  const sinal = v > 0 ? "+" : "";
  return `${sinal}${v.toFixed(casas)}`;
}

export function RelatorioAlunoDoc({ data }: { data: RelatorioAlunoData }) {
  const { aluno, personal, evolucao, exerciciosEvoluindo, medidasRecentes, treinoAtual, pagamentosRecentes } = data;
  const geradoEm = new Date().toLocaleDateString("pt-BR");

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.titulo}>Relatório de acompanhamento — {aluno.nome}</Text>
          <Text style={styles.subtitulo}>
            {personal.nome} · gerado em {geradoEm}
          </Text>
        </View>

        <View style={styles.secao}>
          <Text style={styles.secaoTitulo}>Resumo de evolução (últimos 30 dias)</Text>
          <View style={styles.cardsRow}>
            <View style={styles.card}>
              <Text style={styles.cardValor}>{formatarSinal(evolucao.pesoDeltaKg)}kg</Text>
              <Text style={styles.cardLabel}>Peso</Text>
            </View>
            <View style={styles.card}>
              <Text style={styles.cardValor}>{formatarSinal(evolucao.cargaDeltaPct, 0)}%</Text>
              <Text style={styles.cardLabel}>Carga média</Text>
            </View>
            <View style={styles.card}>
              <Text style={styles.cardValor}>{evolucao.aderenciaPct}%</Text>
              <Text style={styles.cardLabel}>Aderência ao treino</Text>
            </View>
          </View>
          {exerciciosEvoluindo.length > 0 && (
            <View style={{ marginTop: 8 }}>
              <Text style={{ marginBottom: 3, color: "#666666" }}>Exercícios em maior evolução de carga:</Text>
              {exerciciosEvoluindo.map((e) => (
                <View key={e.nome} style={styles.linha}>
                  <Text>{e.nome}</Text>
                  <Text>+{e.percentual}%</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {medidasRecentes.length > 0 && (
          <View style={styles.secao}>
            <Text style={styles.secaoTitulo}>Últimas medidas</Text>
            {medidasRecentes.map((m, i) => (
              <View key={i} style={styles.linha}>
                <Text style={styles.label}>{formatDataBR(m.data)}</Text>
                <Text>
                  {m.peso ? `${m.peso}kg` : "—"} · gordura {m.percentual_gordura ? `${m.percentual_gordura}%` : "—"} · cintura{" "}
                  {m.cintura ? `${m.cintura}cm` : "—"}
                </Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.secao}>
          <Text style={styles.secaoTitulo}>Treino atual</Text>
          {treinoAtual.length === 0 ? (
            <Text style={styles.label}>Sem ciclo de treino ativo no momento.</Text>
          ) : (
            treinoAtual.map((aula, i) => (
              <View key={i} style={styles.aulaBloco}>
                <Text style={styles.aulaNome}>{aula.aulaNome}</Text>
                {aula.exercicios.map((ex, j) => (
                  <View key={j} style={styles.exercicioLinha}>
                    <Text>{ex.nome}</Text>
                    <Text>
                      {ex.series}x{ex.repeticoes}
                      {ex.carga ? ` · ${ex.carga}kg` : ""}
                    </Text>
                  </View>
                ))}
              </View>
            ))
          )}
        </View>

        <View style={styles.secao}>
          <Text style={styles.secaoTitulo}>Pagamento</Text>
          <View style={styles.linha}>
            <Text style={styles.label}>Situação</Text>
            <Text>
              {formatMoedaBR(aluno.pagamento_valor)} · vencimento {formatDataBR(aluno.pagamento_vencimento)}
            </Text>
          </View>
          {pagamentosRecentes.map((p, i) => (
            <View key={i} style={styles.linha}>
              <Text style={styles.label}>{formatDataBR(p.data_pagamento)}</Text>
              <Text>
                {formatMoedaBR(p.valor)} · {p.forma_pagamento}
              </Text>
            </View>
          ))}
        </View>

        <Text style={styles.rodape}>Relatório gerado automaticamente pelo Trainer Pro.</Text>
      </Page>
    </Document>
  );
}
