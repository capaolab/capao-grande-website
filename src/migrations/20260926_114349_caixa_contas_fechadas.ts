import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "caixa" ALTER COLUMN "status" SET DATA TYPE text;
  -- caixa-contas-fechadas.md, RN-CF09: a antiga "aberta" já era a conta em
  -- pagamento (itens congelados, rateio em andamento).
  UPDATE "caixa" SET "status" = 'pagamento' WHERE "status" = 'aberta';
  ALTER TABLE "caixa" ALTER COLUMN "status" SET DEFAULT 'fechada'::text;
  DROP TYPE "public"."enum_caixa_status";
  CREATE TYPE "public"."enum_caixa_status" AS ENUM('fechada', 'pagamento', 'paga');
  ALTER TABLE "caixa" ALTER COLUMN "status" SET DEFAULT 'fechada'::"public"."enum_caixa_status";
  ALTER TABLE "caixa" ALTER COLUMN "status" SET DATA TYPE "public"."enum_caixa_status" USING "status"::"public"."enum_caixa_status";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "caixa" ALTER COLUMN "status" SET DATA TYPE text;
  UPDATE "caixa" SET "status" = 'aberta' WHERE "status" IN ('fechada', 'pagamento');
  ALTER TABLE "caixa" ALTER COLUMN "status" SET DEFAULT 'aberta'::text;
  DROP TYPE "public"."enum_caixa_status";
  CREATE TYPE "public"."enum_caixa_status" AS ENUM('aberta', 'paga');
  ALTER TABLE "caixa" ALTER COLUMN "status" SET DEFAULT 'aberta'::"public"."enum_caixa_status";
  ALTER TABLE "caixa" ALTER COLUMN "status" SET DATA TYPE "public"."enum_caixa_status" USING "status"::"public"."enum_caixa_status";`)
}
