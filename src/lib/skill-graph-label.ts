/** Short display label for long skill names ("ADF / KPSS / ANOVA" → "ADF"). */
export function shortLabel(name: string): string {
  if (name.length <= 16) return name;
  const first = name.split(/\s*[/,(]\s*/)[0]!.trim();
  return first.length <= 18 ? first : `${first.slice(0, 15)}…`;
}
