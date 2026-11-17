import { Suspense } from "react";
import { ProjectsView } from "@/components/projects/projects-view";

export default function ProjelerPage() {
  return (
    <Suspense>
      <ProjectsView />
    </Suspense>
  );
}
