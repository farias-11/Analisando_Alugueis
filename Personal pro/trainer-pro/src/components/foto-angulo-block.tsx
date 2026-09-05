"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { enviarFotoAngulo } from "@/app/actions/medidas";
import { Camera, Check } from "lucide-react";

// tem que ficar abaixo do bodySizeLimit do Server Action (next.config.ts) —
// deixa folga pro overhead do multipart/form-data.
const TAMANHO_MAXIMO_BYTES = 14 * 1024 * 1024;

export function FotoAnguloBlock({ angulo, fotoUrlAtual }: { angulo: string; fotoUrlAtual: string | null }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(enviarFotoAngulo, undefined);
  const [erroTamanho, setErroTamanho] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) router.refresh();
  }, [state, router]);

  return (
    <form ref={formRef} action={formAction}>
      <input type="hidden" name="angulo" value={angulo} />
      <label className="relative flex aspect-[3/4] w-full cursor-pointer flex-col items-center justify-center gap-1.5 overflow-hidden rounded-2xl border border-dashed border-border bg-neutral-soft text-muted">
        {fotoUrlAtual ? (
          <Image
            src={fotoUrlAtual}
            alt={angulo}
            fill
            sizes="(max-width: 768px) 45vw, 200px"
            className="object-cover"
          />
        ) : (
          <>
            <Camera size={22} />
            <span className="text-[11px] font-medium">Adicionar</span>
          </>
        )}
        {fotoUrlAtual && (
          <span className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-success text-white">
            <Check size={12} />
          </span>
        )}
        {pending && (
          <span className="absolute inset-0 flex items-center justify-center bg-black/40 text-xs font-medium text-white">
            Enviando...
          </span>
        )}
        <input
          type="file"
          name="foto"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const arquivo = e.target.files?.[0];
            if (arquivo && arquivo.size > TAMANHO_MAXIMO_BYTES) {
              setErroTamanho("Essa foto é muito grande (máx. 14MB). Tente tirar com menos qualidade ou escolher outra.");
              e.target.value = "";
              return;
            }
            setErroTamanho(null);
            formRef.current?.requestSubmit();
          }}
        />
      </label>
      <p className="mt-1.5 text-center text-xs font-medium text-foreground">{angulo}</p>
      {(erroTamanho || state?.error) && (
        <p className="mt-0.5 text-center text-[10px] text-danger">{erroTamanho || state?.error}</p>
      )}
    </form>
  );
}
