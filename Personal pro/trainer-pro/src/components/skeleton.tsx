export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-neutral-soft ${className}`} />;
}

/** Skeleton genérico pra loading.tsx das telas do aluno — aparece instantaneamente
 * na troca de aba, antes mesmo do servidor responder, pra navegação parecer
 * imediata em vez de "travar" esperando os dados (item de fluidez/performance). */
export function PaginaSkeleton() {
  return (
    <div className="space-y-4 p-4">
      <Skeleton className="h-6 w-32" />
      <Skeleton className="h-28 w-full rounded-2xl" />
      <Skeleton className="h-16 w-full rounded-2xl" />
      <Skeleton className="h-24 w-full rounded-2xl" />
    </div>
  );
}
