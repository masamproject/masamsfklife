import { requireSession } from "@/lib/session";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  await requireSession(); // middleware yalnızca cookie bakar; gerçek doğrulama burada
  return <div className="min-h-screen">{children}</div>;
}
