"use client";

import { useRef, useTransition } from "react";
import Image from "next/image";
import { Camera } from "lucide-react";

export function AvatarUpload({
  fotoUrl,
  nome,
  action,
}: {
  fotoUrl: string | null;
  nome: string;
  action: (formData: FormData) => Promise<void>;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      ref={formRef}
      action={(fd) => startTransition(() => action(fd))}
      className="relative h-16 w-16 shrink-0"
    >
      <label className="group relative block h-16 w-16 cursor-pointer overflow-hidden rounded-full bg-primary-soft">
        {fotoUrl ? (
          <Image src={fotoUrl} alt={nome} fill sizes="64px" className="object-cover" />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-lg font-semibold text-primary-dark">
            {nome.charAt(0)}
          </span>
        )}
        <span className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
          <Camera size={18} className="text-white" />
        </span>
        <input
          type="file"
          name="foto"
          accept="image/*"
          className="hidden"
          disabled={pending}
          onChange={() => formRef.current?.requestSubmit()}
        />
      </label>
    </form>
  );
}
