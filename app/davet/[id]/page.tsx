import { redirect } from "next/navigation";
import { AcceptInvite } from "@/components/layout/accept-invite";
import { getSession } from "@/lib/session";

export default async function DavetPage({ params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) redirect(`/giris?next=${encodeURIComponent(`/davet/${params.id}`)}`);
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <AcceptInvite invitationId={params.id} email={session.user.email} />
    </div>
  );
}
