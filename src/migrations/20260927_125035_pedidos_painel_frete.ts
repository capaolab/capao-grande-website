import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TYPE "public"."enum_pedidos_status" ADD VALUE 'validado' BEFORE 'pago';
  ALTER TYPE "public"."enum_pedidos_pimenta_status" ADD VALUE 'validado' BEFORE 'pago';
  CREATE TABLE "cardapio_delivery" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "cardapio_delivery_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"cardapio_id" integer
  );
  
  ALTER TABLE "pedidos" ADD COLUMN "frete" numeric;
  ALTER TABLE "pedidos_pimenta" ADD COLUMN "frete" numeric;
  ALTER TABLE "cardapio_delivery_rels" ADD CONSTRAINT "cardapio_delivery_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."cardapio_delivery"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cardapio_delivery_rels" ADD CONSTRAINT "cardapio_delivery_rels_cardapio_fk" FOREIGN KEY ("cardapio_id") REFERENCES "public"."cardapio"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "cardapio_delivery_rels_order_idx" ON "cardapio_delivery_rels" USING btree ("order");
  CREATE INDEX "cardapio_delivery_rels_parent_idx" ON "cardapio_delivery_rels" USING btree ("parent_id");
  CREATE INDEX "cardapio_delivery_rels_path_idx" ON "cardapio_delivery_rels" USING btree ("path");
  CREATE INDEX "cardapio_delivery_rels_cardapio_id_idx" ON "cardapio_delivery_rels" USING btree ("cardapio_id");`)

  // Cardápio do delivery (docs/features/pedidos-painel.md): começa com todos
  // os itens ativos (`itens`) e todos os tamanhos ativos (`tamanhos`) — o
  // delivery continua oferecendo o mesmo que antes até o admin ajustar.
  await db.execute(sql`
  INSERT INTO "cardapio_delivery" ("updated_at", "created_at") VALUES (now(), now());
  INSERT INTO "cardapio_delivery_rels" ("order", "parent_id", "path", "cardapio_id")
  SELECT row_number() OVER (ORDER BY s."ordem", c."ordem", c."id"),
         (SELECT "id" FROM "cardapio_delivery" LIMIT 1), 'itens', c."id"
  FROM "cardapio" c
  JOIN "secoes_cardapio" s ON s."id" = c."secao_id"
  WHERE c."ativo" AND s."tipo" <> 'tamanhos';
  INSERT INTO "cardapio_delivery_rels" ("order", "parent_id", "path", "cardapio_id")
  SELECT row_number() OVER (ORDER BY c."ordem", c."id"),
         (SELECT "id" FROM "cardapio_delivery" LIMIT 1), 'tamanhos', c."id"
  FROM "cardapio" c
  JOIN "secoes_cardapio" s ON s."id" = c."secao_id"
  WHERE c."ativo" AND s."tipo" = 'tamanhos';`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "cardapio_delivery" CASCADE;
  DROP TABLE "cardapio_delivery_rels" CASCADE;
  ALTER TABLE "pedidos" ALTER COLUMN "status" SET DATA TYPE text;
  ALTER TABLE "pedidos" ALTER COLUMN "status" SET DEFAULT 'pendente'::text;
  UPDATE "pedidos" SET "status" = 'pendente' WHERE "status" = 'validado';
  DROP TYPE "public"."enum_pedidos_status";
  CREATE TYPE "public"."enum_pedidos_status" AS ENUM('pendente', 'pago', 'em_transito', 'finalizado');
  ALTER TABLE "pedidos" ALTER COLUMN "status" SET DEFAULT 'pendente'::"public"."enum_pedidos_status";
  ALTER TABLE "pedidos" ALTER COLUMN "status" SET DATA TYPE "public"."enum_pedidos_status" USING "status"::"public"."enum_pedidos_status";
  ALTER TABLE "pedidos_pimenta" ALTER COLUMN "status" SET DATA TYPE text;
  ALTER TABLE "pedidos_pimenta" ALTER COLUMN "status" SET DEFAULT 'pendente'::text;
  UPDATE "pedidos_pimenta" SET "status" = 'pendente' WHERE "status" = 'validado';
  DROP TYPE "public"."enum_pedidos_pimenta_status";
  CREATE TYPE "public"."enum_pedidos_pimenta_status" AS ENUM('pendente', 'pago', 'em_transito', 'finalizado');
  ALTER TABLE "pedidos_pimenta" ALTER COLUMN "status" SET DEFAULT 'pendente'::"public"."enum_pedidos_pimenta_status";
  ALTER TABLE "pedidos_pimenta" ALTER COLUMN "status" SET DATA TYPE "public"."enum_pedidos_pimenta_status" USING "status"::"public"."enum_pedidos_pimenta_status";
  ALTER TABLE "pedidos" DROP COLUMN "frete";
  ALTER TABLE "pedidos_pimenta" DROP COLUMN "frete";`)
}
