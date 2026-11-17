import type { Note } from "@/db/schema";
import { MEETING_TEMPLATE } from "@/components/notes/note-editor";

export function newNote(
  ws: { id: string; user: { id: string } },
  type: Note["type"],
  opts: { projectId?: string | null; sectionId?: string | null } = {},
): Note {
  const now = new Date();
  return {
    id: crypto.randomUUID(),
    workspaceId: ws.id,
    authorId: ws.user.id,
    type,
    title: "",
    content: type === "meeting" ? MEETING_TEMPLATE : "",
    meetingDate: now,
    participants: [],
    tags: [],
    actions: [],
    sectionId: opts.sectionId ?? null,
    projectId: opts.projectId ?? null,
    createdAt: now,
    updatedAt: now,
    archivedAt: null,
    deletedAt: null,
  };
}
