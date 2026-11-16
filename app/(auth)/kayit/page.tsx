import { Suspense } from "react";
import { AuthForm } from "@/components/auth/auth-form";

export default function KayitPage() {
  return (
    <Suspense>
      <AuthForm mode="kayit" />
    </Suspense>
  );
}
