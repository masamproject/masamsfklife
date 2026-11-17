import { Suspense } from "react";
import { NotesView } from "@/components/notes/notes-view";

export default function ToplantiPage() {
  return (
    <Suspense>
      <NotesView />
    </Suspense>
  );
}
