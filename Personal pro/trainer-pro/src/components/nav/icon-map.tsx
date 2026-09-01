"use client";

import {
  Home,
  Dumbbell,
  LineChart,
  User,
  LayoutDashboard,
  Users,
  UserPlus,
  Library,
  Layers,
  MessageCircleWarning,
  Wallet,
  Settings,
  type LucideIcon,
} from "lucide-react";

// Ícones resolvidos aqui dentro (client) — nav-items.ts (server) só manda a
// chave (string), nunca o componente em si, porque referências de função não
// atravessam a fronteira Server -> Client Component como prop.
export const ICON_MAP: Record<string, LucideIcon> = {
  home: Home,
  treino: Dumbbell,
  progresso: LineChart,
  conta: User,
  dashboard: LayoutDashboard,
  alunos: Users,
  convidar: UserPlus,
  biblioteca: Library,
  templates: Layers,
  tickets: MessageCircleWarning,
  financeiro: Wallet,
  configuracoes: Settings,
};

export type IconName = keyof typeof ICON_MAP;
