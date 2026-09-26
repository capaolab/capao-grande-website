import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "informes_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"etiquetas_id" integer
  );
  
  CREATE TABLE "etiquetas" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"nome" varchar NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "etiquetas_id" integer;
  ALTER TABLE "informes_rels" ADD CONSTRAINT "informes_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."informes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "informes_rels" ADD CONSTRAINT "informes_rels_etiquetas_fk" FOREIGN KEY ("etiquetas_id") REFERENCES "public"."etiquetas"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "informes_rels_order_idx" ON "informes_rels" USING btree ("order");
  CREATE INDEX "informes_rels_parent_idx" ON "informes_rels" USING btree ("parent_id");
  CREATE INDEX "informes_rels_path_idx" ON "informes_rels" USING btree ("path");
  CREATE INDEX "informes_rels_etiquetas_id_idx" ON "informes_rels" USING btree ("etiquetas_id");
  CREATE UNIQUE INDEX "etiquetas_nome_idx" ON "etiquetas" USING btree ("nome");
  CREATE INDEX "etiquetas_updated_at_idx" ON "etiquetas" USING btree ("updated_at");
  CREATE INDEX "etiquetas_created_at_idx" ON "etiquetas" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_etiquetas_fk" FOREIGN KEY ("etiquetas_id") REFERENCES "public"."etiquetas"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_etiquetas_id_idx" ON "payload_locked_documents_rels" USING btree ("etiquetas_id");
  -- Dados (etiquetas-informes.md, RN-E05): cada valor do antigo select vira
  -- um registro de etiquetas e cada informe passa a apontar para ele.
  INSERT INTO "etiquetas" ("nome")
    SELECT DISTINCT "etiqueta"::text FROM "informes"
    UNION
    SELECT unnest(enum_range(NULL::"enum_informes_etiqueta"))::text;
  INSERT INTO "informes_rels" ("order", "parent_id", "path", "etiquetas_id")
    SELECT 1, i."id", 'etiquetas', e."id"
    FROM "informes" i JOIN "etiquetas" e ON e."nome" = i."etiqueta"::text;
  ALTER TABLE "informes" DROP COLUMN "etiqueta";
  DROP TYPE "public"."enum_informes_etiqueta";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_informes_etiqueta" AS ENUM('Funcionamento', 'Reflorestamento', 'Horta', 'Compostagem', 'Apiário', 'Viveiro', 'Cardápio');
  -- Volta à etiqueta única: a primeira etiqueta de cada informe. Falha no
  -- SET NOT NULL se algum informe só tiver etiquetas criadas depois.
  ALTER TABLE "informes" ADD COLUMN "etiqueta" "enum_informes_etiqueta";
  UPDATE "informes" i SET "etiqueta" = e."nome"::"enum_informes_etiqueta"
    FROM "informes_rels" r JOIN "etiquetas" e ON e."id" = r."etiquetas_id"
    WHERE r."parent_id" = i."id" AND r."path" = 'etiquetas'
      AND e."nome" = ANY(enum_range(NULL::"enum_informes_etiqueta")::text[])
      AND r."order" = (SELECT min(r2."order") FROM "informes_rels" r2
                       WHERE r2."parent_id" = i."id" AND r2."path" = 'etiquetas');
  ALTER TABLE "informes" ALTER COLUMN "etiqueta" SET NOT NULL;
  ALTER TABLE "informes_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "etiquetas" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "informes_rels" CASCADE;
  DROP TABLE "etiquetas" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_etiquetas_fk";
  
  DROP INDEX IF EXISTS "payload_locked_documents_rels_etiquetas_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "etiquetas_id";`)
}
