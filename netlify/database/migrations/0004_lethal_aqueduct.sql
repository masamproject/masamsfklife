CREATE TABLE "people" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "person_ids" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "people" ADD CONSTRAINT "people_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "people_ws_name_uq" ON "people" USING btree ("workspace_id","name");
--> statement-breakpoint
-- Veri taşıma: görevlerdeki eski etiketler (isim olarak kullanılıyordu) "kişi" olur; etiket sütunu verisi olduğu gibi kalır
INSERT INTO "people" ("id", "workspace_id", "name")
SELECT DISTINCT 'p-' || md5(t."workspace_id" || '|' || tag), t."workspace_id", tag
FROM "tasks" t, unnest(t."tags") AS tag
WHERE t."deleted_at" IS NULL AND btrim(tag) <> ''
ON CONFLICT DO NOTHING;--> statement-breakpoint
UPDATE "tasks" t SET "person_ids" = (
  SELECT array_agg(DISTINCT 'p-' || md5(t."workspace_id" || '|' || tag))
  FROM unnest(t."tags") AS tag WHERE btrim(tag) <> ''
) WHERE cardinality(t."tags") > 0;
