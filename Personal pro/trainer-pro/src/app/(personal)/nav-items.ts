import type { NavItem } from "@/components/nav/bottom-nav";

// Sidebar (desktop): os itens do mapeamento de telas do Personal. O Editor de
// treino é acessado a partir da Ficha do aluno (não é uma lista própria).
export const personalSidebarItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: "dashboard" },
  { href: "/alunos", label: "Alunos", icon: "alunos" },
  { href: "/alunos/convidar", label: "Convidar aluno", icon: "convidar" },
  { href: "/biblioteca", label: "Biblioteca de exercícios", icon: "biblioteca" },
  { href: "/templates", label: "Templates de treino", icon: "templates" },
  { href: "/tickets", label: "Tickets de dor", icon: "tickets" },
  { href: "/financeiro", label: "Financeiro", icon: "financeiro" },
  { href: "/configuracoes", label: "Configurações / conta", icon: "configuracoes" },
];

// Bottom nav (mobile): subset com os fluxos do dia a dia; o resto fica
// acessível a partir do Dashboard e da Ficha do aluno.
export const personalBottomNavItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: "dashboard" },
  { href: "/alunos", label: "Alunos", icon: "alunos" },
  { href: "/tickets", label: "Tickets", icon: "tickets" },
  { href: "/financeiro", label: "Financeiro", icon: "financeiro" },
  { href: "/configuracoes", label: "Conta", icon: "configuracoes" },
];
