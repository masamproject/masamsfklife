"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signIn, signUp } from "@/lib/auth-client";

export function AuthForm({ mode }: { mode: "giris" | "kayit" }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const isSignup = mode === "kayit";

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const f = new FormData(e.currentTarget);
    const email = String(f.get("email"));
    const password = String(f.get("password"));

    const res = isSignup
      ? await signUp.email({ email, password, name: String(f.get("name")) })
      : await signIn.email({ email, password });

    setLoading(false);
    if (res.error) {
      setError(res.error.message ?? "Bir hata oluştu.");
      return;
    }
    router.replace("/pano");
    router.refresh();
  }

  async function google() {
    await signIn.social({ provider: "google", callbackURL: "/pano" });
  }

  return (
    <div className="w-full max-w-sm space-y-6 p-6">
      <div className="space-y-1 text-center">
        <h1 className="text-2xl font-bold">{isSignup ? "Masam'a katıl" : "Tekrar hoş geldin"}</h1>
        <p className="text-sm text-muted-foreground">
          {isSignup ? "Boş bir masayla başla." : "Masana giriş yap."}
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        {isSignup && (
          <div className="space-y-2">
            <Label htmlFor="name">Ad</Label>
            <Input id="name" name="name" required autoComplete="name" />
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="email">E-posta</Label>
          <Input id="email" name="email" type="email" required autoComplete="email" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Şifre</Label>
          <Input
            id="password"
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete={isSignup ? "new-password" : "current-password"}
          />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "..." : isSignup ? "Kayıt ol" : "Giriş yap"}
        </Button>
      </form>

      <div className="relative text-center text-xs text-muted-foreground">
        <span className="bg-background px-2">veya</span>
      </div>
      <Button variant="outline" className="w-full" onClick={google} type="button">
        Google ile devam et
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        {isSignup ? (
          <>Hesabın var mı? <Link href="/giris" className="underline">Giriş yap</Link></>
        ) : (
          <>Hesabın yok mu? <Link href="/kayit" className="underline">Kayıt ol</Link></>
        )}
      </p>
    </div>
  );
}
