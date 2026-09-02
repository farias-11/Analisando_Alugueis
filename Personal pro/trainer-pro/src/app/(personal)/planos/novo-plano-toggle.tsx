"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { NovoPlanoForm } from "./plano-form";
import { Plus, X } from "lucide-react";

export function NovoPlanoToggle() {
  const [aberto, setAberto] = useState(false);

  if (!aberto) {
    return (
      <Button onClick={() => setAberto(true)} size="sm" className="gap-1.5">
        <Plus size={16} /> Novo plano
      </Button>
    );
  }

  return (
    <Card className="mb-2">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold">Novo plano</p>
        <button onClick={() => setAberto(false)} className="text-muted-2">
          <X size={18} />
        </button>
      </div>
      <NovoPlanoForm onSalvo={() => setAberto(false)} />
    </Card>
  );
}
