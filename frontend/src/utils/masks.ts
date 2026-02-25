// src/utils/masks.ts — Funções puras de máscara para campos de formulário

/**
 * Aplica máscara de CPF: 000.000.000-00
 */
export function maskCPF(value: string): string {
  return value
    .replace(/\D/g, "")
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

/**
 * Aplica máscara de NIS: 000.00000.00-0
 */
export function maskNIS(value: string): string {
  return value
    .replace(/\D/g, "")
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{5})(\d)/, "$1.$2")
    .replace(/(\d{2})(\d{1})$/, "$1-$2");
}

/**
 * Remove todos os caracteres não numéricos (desfaz a máscara)
 */
export function unmask(value: string): string {
  return value.replace(/\D/g, "");
}
