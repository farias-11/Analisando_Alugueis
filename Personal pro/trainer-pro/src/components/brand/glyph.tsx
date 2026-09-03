/** Monograma Duo Flow (SVG oficial, variante 100% branca — regra do
 * README.md da marca: "fundo escuro, use sempre a versão em que o F é
 * branco") — usar dentro de uma caixa com bg-primary. */
export function BrandGlyph({ size = 20, className }: { size?: number; className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/brand/duoflow-simbolo-branco.svg" alt="" width={size} height={size} className={className} />;
}
