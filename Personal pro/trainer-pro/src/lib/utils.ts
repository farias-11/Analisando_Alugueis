import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Number(v) direto quebra em "75,5" — teclado numérico de celular em
 * português usa vírgula como separador decimal, e o app aceita as duas
 * formas. Usar em qualquer valor decimal digitado pelo usuário (peso,
 * carga, medidas). */
export function parseDecimalBR(v: FormDataEntryValue | string | null | undefined): number | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim().replace(",", ".");
  if (s === "") return null;
  const n = Number(s);
  return Number.isNaN(n) ? null : n;
}

/** Nome de arquivo enviado pelo usuário, seguro pra virar parte de um path de
 * storage. O upload sempre vai pro client admin (service role, ignora RLS de
 * bucket) prefixado por um id confiável (aluno/personal/autor) — mas o nome
 * original do arquivo, se usado cru, pode conter "/" ou "..", escapando essa
 * pasta. Mantém só letras/números/._- e limita o tamanho. */
export function sanitizeFileName(nome: string): string {
  const limpo = nome
    .normalize("NFKD")
    .replace(/[^\w.-]/g, "_")
    .slice(-100);
  return limpo || "arquivo";
}
