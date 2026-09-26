import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_secoes_cardapio_tipo" AS ENUM('comum', 'por-tamanho', 'tamanhos');
  CREATE TABLE "secoes_cardapio" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"nome" varchar NOT NULL,
  	"ordem" numeric,
  	"tipo" "enum_secoes_cardapio_tipo" DEFAULT 'comum' NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "cardapio" ADD COLUMN "secao_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "secoes_cardapio_id" integer;
  CREATE UNIQUE INDEX "secoes_cardapio_nome_idx" ON "secoes_cardapio" USING btree ("nome");
  CREATE INDEX "secoes_cardapio_updated_at_idx" ON "secoes_cardapio" USING btree ("updated_at");
  CREATE INDEX "secoes_cardapio_created_at_idx" ON "secoes_cardapio" USING btree ("created_at");
  ALTER TABLE "cardapio" ADD CONSTRAINT "cardapio_secao_id_secoes_cardapio_id_fk" FOREIGN KEY ("secao_id") REFERENCES "public"."secoes_cardapio"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_secoes_cardapio_fk" FOREIGN KEY ("secoes_cardapio_id") REFERENCES "public"."secoes_cardapio"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "cardapio_secao_idx" ON "cardapio" USING btree ("secao_id");
  CREATE INDEX "payload_locked_documents_rels_secoes_cardapio_id_idx" ON "payload_locked_documents_rels" USING btree ("secoes_cardapio_id");
  -- Dados (secoes-cardapio.md, RN-S06): as 4 seções fixas viram registros,
  -- com o tipo que antes dependia do nome, e os itens passam a apontar para
  -- elas.
  INSERT INTO "secoes_cardapio" ("nome", "ordem", "tipo") VALUES
    ('Pizzas', 1, 'por-tamanho'),
    ('Tamanhos', 2, 'tamanhos'),
    ('Bebidas', 3, 'comum'),
    ('Vinhos', 4, 'comum');
  UPDATE "cardapio" c SET "secao_id" = s."id"
    FROM "secoes_cardapio" s WHERE s."nome" = c."secao"::text;
  ALTER TABLE "cardapio" ALTER COLUMN "secao_id" SET NOT NULL;
  ALTER TABLE "cardapio" DROP COLUMN "secao";
  DROP TYPE "public"."enum_cardapio_secao";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_cardapio_secao" AS ENUM('Pizzas', 'Tamanhos', 'Bebidas', 'Vinhos');
  -- Volta à seção fixa pelo nome. Falha no SET NOT NULL se algum item
  -- estiver numa seção criada depois (ex.: Sobremesas).
  ALTER TABLE "cardapio" ADD COLUMN "secao" "enum_cardapio_secao";
  UPDATE "cardapio" c SET "secao" = s."nome"::"enum_cardapio_secao"
    FROM "secoes_cardapio" s
    WHERE s."id" = c."secao_id"
      AND s."nome" = ANY(enum_range(NULL::"enum_cardapio_secao")::text[]);
  ALTER TABLE "cardapio" ALTER COLUMN "secao" SET NOT NULL;
  ALTER TABLE "secoes_cardapio" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "secoes_cardapio" CASCADE;
  ALTER TABLE "cardapio" DROP CONSTRAINT IF EXISTS "cardapio_secao_id_secoes_cardapio_id_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_secoes_cardapio_fk";
  
  DROP INDEX IF EXISTS "cardapio_secao_idx";
  DROP INDEX IF EXISTS "payload_locked_documents_rels_secoes_cardapio_id_idx";
  ALTER TABLE "cardapio" DROP COLUMN "secao_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "secoes_cardapio_id";
  DROP TYPE "public"."enum_secoes_cardapio_tipo";`)
}
