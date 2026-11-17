CREATE TABLE "files" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"project_id" text,
	"uploader_id" text NOT NULL,
	"name" text NOT NULL,
	"size" bigint DEFAULT 0 NOT NULL,
	"content_type" text NOT NULL,
	"blob_key" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"archived_at" timestamp,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "notebooks" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"name" text NOT NULL,
	"color" text DEFAULT '#868e96' NOT NULL,
	"position" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"archived_at" timestamp,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "sections" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"notebook_id" text NOT NULL,
	"name" text NOT NULL,
	"color" text DEFAULT '#868e96' NOT NULL,
	"position" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "tasks" ALTER COLUMN "priority" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "tasks" ALTER COLUMN "priority" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "notes" ADD COLUMN "tags" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "notes" ADD COLUMN "actions" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "notes" ADD COLUMN "section_id" text;--> statement-breakpoint
ALTER TABLE "notes" ADD COLUMN "project_id" text;--> statement-breakpoint
ALTER TABLE "notes" ADD COLUMN "archived_at" timestamp;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "project_id" text;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "archived_at" timestamp;--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_uploader_id_user_id_fk" FOREIGN KEY ("uploader_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notebooks" ADD CONSTRAINT "notebooks_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sections" ADD CONSTRAINT "sections_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sections" ADD CONSTRAINT "sections_notebook_id_notebooks_id_fk" FOREIGN KEY ("notebook_id") REFERENCES "public"."notebooks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "files_ws_idx" ON "files" USING btree ("workspace_id","project_id");--> statement-breakpoint
CREATE INDEX "notebooks_ws_idx" ON "notebooks" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "projects_ws_idx" ON "projects" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "sections_ws_idx" ON "sections" USING btree ("workspace_id","notebook_id");--> statement-breakpoint
ALTER TABLE "notes" ADD CONSTRAINT "notes_section_id_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."sections"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notes" ADD CONSTRAINT "notes_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "notes_project_idx" ON "notes" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "tasks_project_idx" ON "tasks" USING btree ("project_id");