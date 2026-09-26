import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "informes" ADD COLUMN "capa_unsplash_url" varchar;
  ALTER TABLE "informes" ADD COLUMN "capa_unsplash_alt" varchar;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "informes" DROP COLUMN "capa_unsplash_url";
  ALTER TABLE "informes" DROP COLUMN "capa_unsplash_alt";`)
}
