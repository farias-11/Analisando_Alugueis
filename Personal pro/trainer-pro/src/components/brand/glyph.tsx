/** Monograma Duo Flow (glifo branco, fundo transparente) — usar dentro de uma
 * caixa com bg-primary, no lugar do ícone genérico que tinha antes ali. */
export function BrandGlyph({ size = 20, className }: { size?: number; className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/brand/glyph-white.png" alt="" width={size} height={size} className={className} />;
}
