import { relations } from "drizzle-orm";
import {
  bigint,
  boolean,
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export type NoteAction = { id: string; text: string; taskId: string };

/* ------------------------------------------------------------------ */
/* Enums                                                               */
/* ------------------------------------------------------------------ */
export const planEnum = pgEnum("plan", ["free", "pro"]);
export const priorityEnum = pgEnum("priority", ["low", "medium", "high"]);
export const noteTypeEnum = pgEnum("note_type", ["free", "meeting"]);

/* ------------------------------------------------------------------ */
/* Better Auth çekirdek tabloları                                      */
/* ------------------------------------------------------------------ */
export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    token: text("token").notNull().unique(),
    expiresAt: timestamp("expires_at").notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    // Organization eklentisi: aktif workspace
    activeOrganizationId: text("active_organization_id"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [index("session_user_idx").on(t.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [index("account_user_idx").on(t.userId)],
);

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/* ------------------------------------------------------------------ */
/* Workspace (Better Auth "organization" eklentisine eşlenecek)        */
/* ------------------------------------------------------------------ */
export const workspaces = pgTable(
  "workspaces",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    logo: text("logo"),
    metadata: text("metadata"),
    plan: planEnum("plan").notNull().default("free"),
    ownerId: text("owner_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("workspaces_slug_uq").on(t.slug)],
);

// role: 'owner' | 'admin' | 'member'  (Better Auth rol metni için text)
export const workspaceMembers = pgTable(
  "workspace_members",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: text("role", { enum: ["owner", "admin", "member"] })
      .notNull()
      .default("member"),
    joinedAt: timestamp("joined_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("workspace_members_uq").on(t.workspaceId, t.userId),
    index("workspace_members_user_idx").on(t.userId),
  ],
);

export const invitations = pgTable(
  "invitations",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    role: text("role"),
    status: text("status").notNull().default("pending"),
    expiresAt: timestamp("expires_at").notNull(),
    inviterId: text("inviter_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("invitations_workspace_idx").on(t.workspaceId)],
);

/* ------------------------------------------------------------------ */
/* İçerik tabloları (hepsi workspaceId ile izole + soft delete)        */
/* ------------------------------------------------------------------ */
/* ------------------------------------------------------------------ */
/* Projeler, defterler, bölümler, dosyalar                             */
/* ------------------------------------------------------------------ */
export const projects = pgTable(
  "projects",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    archivedAt: timestamp("archived_at"),
    deletedAt: timestamp("deleted_at"),
  },
  (t) => [index("projects_ws_idx").on(t.workspaceId)],
);

export const notebooks = pgTable(
  "notebooks",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    color: text("color").notNull().default("#868e96"),
    position: text("position").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    deletedAt: timestamp("deleted_at"),
  },
  (t) => [index("notebooks_ws_idx").on(t.workspaceId)],
);

export const sections = pgTable(
  "sections",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    notebookId: text("notebook_id")
      .notNull()
      .references(() => notebooks.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    color: text("color").notNull().default("#868e96"),
    position: text("position").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    deletedAt: timestamp("deleted_at"),
  },
  (t) => [index("sections_ws_idx").on(t.workspaceId, t.notebookId)],
);

export const files = pgTable(
  "files",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    projectId: text("project_id").references(() => projects.id, { onDelete: "set null" }),
    uploaderId: text("uploader_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    size: bigint("size", { mode: "number" }).notNull().default(0),
    contentType: text("content_type").notNull(),
    blobKey: text("blob_key").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    archivedAt: timestamp("archived_at"),
    deletedAt: timestamp("deleted_at"),
  },
  (t) => [index("files_ws_idx").on(t.workspaceId, t.projectId)],
);

export const lists = pgTable(
  "lists",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    position: text("position").notNull(), // fractional index
    createdAt: timestamp("created_at").notNull().defaultNow(),
    deletedAt: timestamp("deleted_at"),
  },
  (t) => [index("lists_ws_pos_idx").on(t.workspaceId, t.position)],
);

export const notes = pgTable(
  "notes",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    authorId: text("author_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    type: noteTypeEnum("type").notNull().default("free"),
    title: text("title").notNull().default(""),
    content: text("content").notNull().default(""), // markdown
    meetingDate: timestamp("meeting_date"),
    participants: text("participants").array().notNull().default([]),
    tags: text("tags").array().notNull().default([]),
    // Toplantı aksiyon maddeleri; taskId doluysa göreve çevrilmiştir
    actions: jsonb("actions").$type<NoteAction[]>().notNull().default([]),
    sectionId: text("section_id").references(() => sections.id, { onDelete: "set null" }),
    projectId: text("project_id").references(() => projects.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    archivedAt: timestamp("archived_at"),
    deletedAt: timestamp("deleted_at"),
  },
  (t) => [
    index("notes_ws_idx").on(t.workspaceId, t.updatedAt),
    index("notes_project_idx").on(t.projectId),
  ],
);

export const tasks = pgTable(
  "tasks",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    creatorId: text("creator_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    assigneeId: text("assignee_id").references(() => user.id, {
      onDelete: "set null",
    }),
    listId: text("list_id").references(() => lists.id, { onDelete: "set null" }),
    noteId: text("note_id").references(() => notes.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    dueDate: timestamp("due_date"),
    priority: priorityEnum("priority"), // null = öncelik yok
    tags: text("tags").array().notNull().default([]),
    isCompleted: boolean("is_completed").notNull().default(false),
    projectId: text("project_id").references(() => projects.id, { onDelete: "set null" }),
    position: text("position").notNull(), // fractional index
    createdAt: timestamp("created_at").notNull().defaultNow(),
    archivedAt: timestamp("archived_at"),
    deletedAt: timestamp("deleted_at"),
  },
  (t) => [
    index("tasks_project_idx").on(t.projectId),
    index("tasks_ws_list_pos_idx").on(t.workspaceId, t.listId, t.position),
    index("tasks_ws_due_idx").on(t.workspaceId, t.dueDate),
    index("tasks_assignee_idx").on(t.assigneeId),
    index("tasks_note_idx").on(t.noteId),
  ],
);

/* ------------------------------------------------------------------ */
/* Relations                                                           */
/* ------------------------------------------------------------------ */
export const workspacesRelations = relations(workspaces, ({ one, many }) => ({
  owner: one(user, { fields: [workspaces.ownerId], references: [user.id] }),
  members: many(workspaceMembers),
  lists: many(lists),
  tasks: many(tasks),
  notes: many(notes),
}));

export const workspaceMembersRelations = relations(workspaceMembers, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [workspaceMembers.workspaceId],
    references: [workspaces.id],
  }),
  user: one(user, { fields: [workspaceMembers.userId], references: [user.id] }),
}));

export const listsRelations = relations(lists, ({ one, many }) => ({
  workspace: one(workspaces, { fields: [lists.workspaceId], references: [workspaces.id] }),
  tasks: many(tasks),
}));

export const tasksRelations = relations(tasks, ({ one }) => ({
  workspace: one(workspaces, { fields: [tasks.workspaceId], references: [workspaces.id] }),
  list: one(lists, { fields: [tasks.listId], references: [lists.id] }),
  note: one(notes, { fields: [tasks.noteId], references: [notes.id] }),
  creator: one(user, { fields: [tasks.creatorId], references: [user.id], relationName: "creator" }),
  assignee: one(user, { fields: [tasks.assigneeId], references: [user.id], relationName: "assignee" }),
}));

export const notesRelations = relations(notes, ({ one, many }) => ({
  workspace: one(workspaces, { fields: [notes.workspaceId], references: [workspaces.id] }),
  author: one(user, { fields: [notes.authorId], references: [user.id] }),
  tasks: many(tasks),
}));

export type Workspace = typeof workspaces.$inferSelect;
export type WorkspaceMember = typeof workspaceMembers.$inferSelect;
export type List = typeof lists.$inferSelect;
export type Task = typeof tasks.$inferSelect;
export type Note = typeof notes.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type Notebook = typeof notebooks.$inferSelect;
export type Section = typeof sections.$inferSelect;
export type FileRow = typeof files.$inferSelect;
