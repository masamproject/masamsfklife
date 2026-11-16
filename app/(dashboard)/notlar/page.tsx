import { Suspense } from "react";
import { NotesView } from "@/components/notes/notes-view";

export default function NotlarPage() {
  return (
    <Suspense>
      <NotesView />
    </Suspense>
  );
}
