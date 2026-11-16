/** "## Aksiyonlar" başlığı altındaki madde satırlarını çıkarır. */
export function parseActionItems(content: string): string[] {
  const lines = content.split("\n");
  const start = lines.findIndex((l) => /^#{1,6}\s*aksiyonlar\b/i.test(l.trim()));
  if (start < 0) return [];
  const out: string[] = [];
  for (const line of lines.slice(start + 1)) {
    if (/^#{1,6}\s/.test(line.trim())) break;
    const m = line.match(/^\s*[-*]\s+(?:\[[ xX]\]\s*)?(.+)$/);
    const text = m?.[1].trim();
    if (text) out.push(text);
  }
  return out;
}
