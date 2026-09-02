export function validarSenha(senha: string): string | null {
  if (senha.length < 8) return "A senha precisa ter pelo menos 8 caracteres.";
  if (!/[A-Z]/.test(senha)) return "A senha precisa ter pelo menos uma letra maiúscula.";
  if (!/[0-9]/.test(senha)) return "A senha precisa ter pelo menos um número.";
  return null;
}
