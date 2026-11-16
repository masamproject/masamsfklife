import { Suspense } from "react";
import { AuthForm } from "@/components/auth/auth-form";

export default function GirisPage() {
  return (
    <Suspense>
      <AuthForm mode="giris" />
    </Suspense>
  );
}
