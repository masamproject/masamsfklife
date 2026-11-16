import {
  CalendarCheck,
  Check,
  KanbanSquare,
  ListTodo,
  NotebookText,
  Users,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Button } from "@/components/ui/button";
import { getSession } from "@/lib/session";

const FEATURES = [
  {
    icon: KanbanSquare,
    title: "Trello akışkanlığında pano",
    text: "Listeleri ve kartları sürükle, bırak. Konum anında değişir; sıralama tek satır yazar.",
  },
  {
    icon: ListTodo,
    title: "Akıllı yapılacaklar listesi",
    text: "Gecikmiş, bugün, bu hafta… Görevlerin tarihe göre kendiliğinden gruplanır.",
  },
  {
    icon: NotebookText,
    title: "Toplantı notları",
    text: "Gündem, kararlar ve aksiyonlar hazır şablonda. Bir tıkla aksiyonu göreve çevir.",
  },
  {
    icon: Users,
    title: "Ekip alanları",
    text: "Kişisel masan ve ekip masaların ayrı. Üye davet et, rol ver, görev ata.",
  },
  {
    icon: Zap,
    title: "Anında tepki",
    text: "Arayüz beklemez: değişiklik hemen görünür, arka planda kaydedilir, hata olursa geri alınır.",
  },
  {
    icon: CalendarCheck,
    title: "Güvenli çöp kutusu",
    text: "Sildiklerin 5 saniye içinde geri alınabilir, çöp kutusunda saklanır.",
  },
];

const FREE = ["1 kişisel alan", "3 liste", "Sınırsız kart ve not", "Ekip daveti"];
const PRO = ["Sınırsız liste", "Free'deki her şey", "Öncelikli destek"];

export default async function LandingPage() {
  const session = await getSession();
  const cta = session ? { href: "/pano", label: "Panoya git" } : { href: "/kayit", label: "Ücretsiz başla" };

  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <span className="text-xl font-bold tracking-tight">Masam</span>
        <nav className="flex items-center gap-2">
          <ThemeToggle />
          {!session && (
            <Button asChild variant="ghost">
              <Link href="/giris">Giriş</Link>
            </Button>
          )}
          <Button asChild>
            <Link href={cta.href}>{cta.label}</Link>
          </Button>
        </nav>
      </header>

      <main>
        <section className="mx-auto max-w-3xl px-4 py-20 text-center sm:py-28">
          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
            Pano, görevler ve notlar.
            <br />
            <span className="text-muted-foreground">Tek masada.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
            Masam; kanban panosu, yapılacaklar listesi ve toplantı notlarını bir araya getirir. Hızlı,
            sade ve ekibinle birlikte çalışmaya hazır.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Button asChild size="lg">
              <Link href={cta.href}>{cta.label}</Link>
            </Button>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">Kredi kartı gerekmez. Boş bir masayla başlarsın.</p>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-20">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="rounded-xl border bg-card p-5">
                <f.icon className="mb-3 h-6 w-6" />
                <h3 className="font-semibold">{f.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{f.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-3xl px-4 pb-24">
          <h2 className="mb-8 text-center text-3xl font-bold">Fiyatlandırma</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { name: "Free", price: "0 ₺", items: FREE, highlight: false },
              { name: "Pro", price: "Yakında", items: PRO, highlight: true },
            ].map((p) => (
              <div
                key={p.name}
                className={`rounded-xl border p-6 ${p.highlight ? "border-foreground" : ""}`}
              >
                <h3 className="text-lg font-semibold">{p.name}</h3>
                <p className="mt-1 text-3xl font-bold">{p.price}</p>
                <ul className="mt-4 space-y-2 text-sm">
                  {p.items.map((i) => (
                    <li key={i} className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-emerald-500" /> {i}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t py-6 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Masam
      </footer>
    </div>
  );
}
