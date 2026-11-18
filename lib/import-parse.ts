/** İçe aktarma biçimleri: Masam JSON ({lists:[{title,cards:[{title,...}]}]}) ve Trello "JSON olarak dışa aktar". */
export type ImportBoard = {
  lists: { title: string; cards: { title: string; description?: string; labels?: string[]; due?: string | null }[] }[];
  name?: string;
};

type Json = Record<string, unknown>;
const isObj = (v: unknown): v is Json => typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: unknown) => (typeof v === "string" ? v : "");

export function parseImport(text: string): ImportBoard {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error("Geçerli bir JSON değil.");
  }
  if (!isObj(raw) || !Array.isArray(raw.lists)) throw new Error("'lists' alanı bulunamadı.");

  // Trello: lists + cards ayrı dizilerde, kartlar idList ile bağlı
  if (Array.isArray(raw.cards)) {
    const cards = (raw.cards as Json[]).filter((c) => !c.closed);
    const lists = (raw.lists as Json[])
      .filter((l) => !l.closed)
      .sort((a, b) => Number(a.pos ?? 0) - Number(b.pos ?? 0))
      .map((l) => ({
        title: str(l.name),
        cards: cards
          .filter((c) => c.idList === l.id)
          .sort((a, b) => Number(a.pos ?? 0) - Number(b.pos ?? 0))
          .map((c) => ({
            title: str(c.name),
            description: str(c.desc),
            labels: Array.isArray(c.labels)
              ? (c.labels as Json[]).map((x) => str(x.name) || str(x.color)).filter(Boolean)
              : [],
            due: typeof c.due === "string" ? c.due : null,
          })),
      }));
    return { lists, name: str(raw.name) };
  }

  // Masam biçimi
  const lists = (raw.lists as Json[]).map((l) => ({
    title: str(l.title) || str(l.name),
    cards: (Array.isArray(l.cards) ? (l.cards as unknown[]) : []).map((c) =>
      typeof c === "string"
        ? { title: c }
        : {
            title: str((c as Json).title) || str((c as Json).name),
            description: str((c as Json).description) || undefined,
            labels: Array.isArray((c as Json).labels) ? ((c as Json).labels as string[]) : undefined,
            due: typeof (c as Json).due === "string" ? ((c as Json).due as string) : null,
          },
    ),
  }));
  return { lists, name: str(raw.project) || str(raw.name) };
}
