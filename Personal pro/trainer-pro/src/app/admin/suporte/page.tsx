import { requireAdmin } from "@/lib/data/current-user";
import { createClient } from "@/lib/supabase/server";
import { getSignedUrls } from "@/lib/supabase/signed-url";
import { responderTicketSuporte } from "@/app/actions/suporte";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDataBR } from "@/lib/status";
import { logout } from "@/app/actions/auth";
import { Bug, Lightbulb, LogOut } from "lucide-react";
import Link from "next/link";
import type { TicketSuporte } from "@/lib/types";

export default async function AdminSuportePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { admin } = await requireAdmin();
  const { status = "aberto" } = await searchParams;
  const supabase = await createClient();

  const { data: tickets } = await supabase
    .from("tickets_suporte")
    .select("*, personals(nome), alunos(nome)")
    .eq("status", status)
    .order("created_at", { ascending: false });

  type TicketComAutor = TicketSuporte & { personals: { nome: string } | null; alunos: { nome: string } | null };
  const lista = (tickets ?? []) as unknown as TicketComAutor[];

  const todosPaths = lista.flatMap((t) => t.print_urls);
  const urlsAssinadas = await getSignedUrls("tickets", todosPaths);
  const listaComPrint = lista.map((t) => ({
    ...t,
    printSignedUrls: t.print_urls.map((path) => urlsAssinadas.get(path)).filter((url): url is string => !!url),
  }));

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Suporte interno</h1>
          <p className="text-sm text-muted">Olá, {admin.nome.split(" ")[0]}</p>
        </div>
        <form action={logout}>
          <Button type="submit" variant="ghost" size="sm" className="gap-1.5">
            <LogOut size={14} /> Sair
          </Button>
        </form>
      </div>

      <div className="flex gap-2">
        <Link
          href="/admin/suporte?status=aberto"
          className={`rounded-pill border px-3.5 py-1.5 text-sm font-medium ${status === "aberto" ? "border-primary bg-primary-soft text-primary-dark" : "border-border text-muted"}`}
        >
          Abertos
        </Link>
        <Link
          href="/admin/suporte?status=resolvido"
          className={`rounded-pill border px-3.5 py-1.5 text-sm font-medium ${status === "resolvido" ? "border-primary bg-primary-soft text-primary-dark" : "border-border text-muted"}`}
        >
          Resolvidos
        </Link>
      </div>

      <div className="space-y-3">
        {listaComPrint.map((t) => (
          <Card key={t.id}>
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {t.categoria === "bug" ? (
                  <Bug size={16} className="text-danger" />
                ) : (
                  <Lightbulb size={16} className="text-warning" />
                )}
                <CardTitle>{t.categoria === "bug" ? "Erro/bug" : "Sugestão"}</CardTitle>
              </div>
              <Badge status={t.status} />
            </div>
            <p className="mb-1 text-xs text-muted">
              {t.autor_tipo === "personal" ? "Personal" : "Aluno"} · {t.personals?.nome ?? t.alunos?.nome} ·{" "}
              {formatDataBR(t.created_at)}
            </p>
            <p className="text-sm">{t.descricao}</p>
            {t.printSignedUrls.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {t.printSignedUrls.map((url, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={i} src={url} alt="Print anexado" className="max-h-64 rounded-lg border border-border" />
                ))}
              </div>
            )}

            {t.status === "aberto" ? (
              <form action={responderTicketSuporte} className="mt-3 space-y-2">
                <input type="hidden" name="ticketId" value={t.id} />
                <textarea
                  name="resposta"
                  required
                  placeholder="Resposta/observação (marca como resolvido)"
                  className="h-20 w-full rounded-lg border border-border p-2.5 text-sm"
                />
                <Button type="submit" size="sm">
                  Marcar como resolvido
                </Button>
              </form>
            ) : (
              t.resposta_admin && (
                <div className="mt-3 rounded-lg bg-success-soft px-3 py-2 text-sm text-success">
                  {t.resposta_admin}
                </div>
              )
            )}
          </Card>
        ))}
        {listaComPrint.length === 0 && (
          <p className="text-sm text-muted">Nenhum ticket {status === "aberto" ? "aberto" : "resolvido"}.</p>
        )}
      </div>
    </div>
  );
}
