/** Minúsculas y sin diacríticos: «Bogotá» y «bogota» coinciden; «Nariño» queda «narino». */
export function normalizeText(value: string): string {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}
