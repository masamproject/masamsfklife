ALTER TABLE "lists" ADD COLUMN "project_id" text;--> statement-breakpoint
ALTER TABLE "lists" ADD COLUMN "is_done" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "lists" ADD CONSTRAINT "lists_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "lists_project_idx" ON "lists" USING btree ("project_id");
--> statement-breakpoint
-- Veri düzeltmesi: "tamamlandı" adlı listeler artık işaretli (eski "son liste = bitti" kuralının yerine)
UPDATE "lists" SET "is_done" = true WHERE "deleted_at" IS NULL AND lower("title") IN ('bitti', 'tamamlandı', 'tamamlandi', 'done', 'completed');--> statement-breakpoint
-- Yalnızca tek bir projenin kartlarını taşıyan listeler o projeye bağlanır (varsayılan ortak listeler hariç)
UPDATE "lists" l SET "project_id" = x.pid FROM (
  SELECT t."list_id" AS lid, min(t."project_id") AS pid
  FROM "tasks" t
  WHERE t."deleted_at" IS NULL AND t."list_id" IS NOT NULL
  GROUP BY t."list_id"
  HAVING count(t."project_id") = count(*) AND count(DISTINCT t."project_id") = 1
) x WHERE l."id" = x.lid AND l."id" NOT LIKE '%-d_';
--> statement-breakpoint
-- Boş bir liste, iki yanındaki listeler aynı projeye bağlıysa o projeye bağlanır (ör. boş "Furkan Kontrol")
UPDATE "lists" l SET "project_id" = q.prev_p FROM (
  SELECT "id", "project_id", lag("project_id") OVER w AS prev_p, lead("project_id") OVER w AS next_p
  FROM "lists" WHERE "deleted_at" IS NULL
  WINDOW w AS (PARTITION BY "workspace_id" ORDER BY "position" COLLATE "C")
) q WHERE l."id" = q."id" AND q."project_id" IS NULL AND q.prev_p IS NOT NULL AND q.prev_p = q.next_p AND l."id" NOT LIKE '%-d_';
