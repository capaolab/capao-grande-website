import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."_locales" AS ENUM('pt', 'en');
  CREATE TYPE "public"."enum_users_role" AS ENUM('admin', 'funcionario', 'cliente');
  CREATE TYPE "public"."enum_informes_etiqueta" AS ENUM('Funcionamento', 'Reflorestamento', 'Horta', 'Compostagem', 'Apiário', 'Viveiro', 'Cardápio');
  CREATE TYPE "public"."enum_cardapio_secao" AS ENUM('Pizzas', 'Tamanhos', 'Bebidas', 'Vinhos');
  CREATE TYPE "public"."enum_pedidos_status" AS ENUM('pendente', 'pago', 'em_transito', 'finalizado');
  CREATE TYPE "public"."enum_caixa_pagamentos_forma" AS ENUM('pix', 'dinheiro', 'cartao');
  CREATE TYPE "public"."enum_caixa_status" AS ENUM('aberta', 'paga');
  CREATE TYPE "public"."enum_pedidos_pimenta_modalidade" AS ENUM('entrega', 'retirada');
  CREATE TYPE "public"."enum_pedidos_pimenta_status" AS ENUM('pendente', 'pago', 'em_transito', 'finalizado');
  CREATE TABLE "users_sessions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"created_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "users" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"nome" varchar,
  	"sobrenome" varchar,
  	"telefone" varchar,
  	"latitude" numeric,
  	"longitude" numeric,
  	"localidade" varchar,
  	"role" "enum_users_role" DEFAULT 'cliente' NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"email" varchar NOT NULL,
  	"reset_password_token" varchar,
  	"reset_password_expiration" timestamp(3) with time zone,
  	"salt" varchar,
  	"hash" varchar,
  	"login_attempts" numeric DEFAULT 0,
  	"lock_until" timestamp(3) with time zone
  );
  
  CREATE TABLE "media" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"alt" varchar NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"focal_x" numeric,
  	"focal_y" numeric
  );
  
  CREATE TABLE "informes" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"slug" varchar,
  	"data" timestamp(3) with time zone,
  	"etiqueta" "enum_informes_etiqueta" NOT NULL,
  	"capa_id" integer,
  	"destaque" boolean DEFAULT false,
  	"publicado" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "informes_locales" (
  	"titulo" varchar NOT NULL,
  	"resumo" varchar,
  	"corpo" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "cardapio" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"secao" "enum_cardapio_secao" NOT NULL,
  	"nome" varchar NOT NULL,
  	"preco" numeric,
  	"ordem" numeric,
  	"ativo" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "cardapio_locales" (
  	"detalhe" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "cronologia" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"ano" varchar,
  	"titulo" varchar NOT NULL,
  	"texto" varchar,
  	"ilustracao_id" integer,
  	"ordem" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "pedidos_itens" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"item_id" integer NOT NULL,
  	"quantidade" numeric DEFAULT 1 NOT NULL,
  	"tamanho_id" integer,
  	"nome_snapshot" varchar,
  	"preco_unitario" numeric
  );
  
  CREATE TABLE "pedidos" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"codigo" varchar,
  	"nome" varchar NOT NULL,
  	"telefone" varchar NOT NULL,
  	"latitude" numeric NOT NULL,
  	"longitude" numeric NOT NULL,
  	"localidade" varchar,
  	"observacoes" varchar,
  	"subtotal" numeric,
  	"status" "enum_pedidos_status" DEFAULT 'pendente' NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "caixa_itens" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"item_id" integer NOT NULL,
  	"quantidade" numeric DEFAULT 1 NOT NULL,
  	"tamanho_id" integer,
  	"nome_snapshot" varchar,
  	"preco_unitario" numeric
  );
  
  CREATE TABLE "caixa_pagamentos" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"valor" numeric NOT NULL,
  	"forma" "enum_caixa_pagamentos_forma",
  	"pago" boolean DEFAULT false,
  	"pago_em" timestamp(3) with time zone,
  	"editado" boolean DEFAULT false
  );
  
  CREATE TABLE "caixa" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"codigo" varchar,
  	"mesa" varchar,
  	"subtotal" numeric,
  	"servico" boolean DEFAULT false,
  	"taxa_servico" numeric,
  	"desconto" numeric DEFAULT 0,
  	"total" numeric,
  	"status" "enum_caixa_status" DEFAULT 'aberta' NOT NULL,
  	"funcionario_id" integer,
  	"observacoes" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "produtos_pimenta" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"nome" varchar NOT NULL,
  	"volume" varchar,
  	"descricao" varchar,
  	"preco" numeric NOT NULL,
  	"preco_lote" numeric,
  	"lote_minimo" numeric,
  	"imagem_id" integer,
  	"ordem" numeric,
  	"ativo" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "pedidos_pimenta_itens" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"produto_id" integer NOT NULL,
  	"quantidade" numeric DEFAULT 1 NOT NULL,
  	"nome_snapshot" varchar,
  	"preco_unitario" numeric,
  	"lote" boolean
  );
  
  CREATE TABLE "pedidos_pimenta" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"codigo" varchar,
  	"nome" varchar NOT NULL,
  	"telefone" varchar NOT NULL,
  	"estabelecimento" varchar,
  	"modalidade" "enum_pedidos_pimenta_modalidade" DEFAULT 'entrega' NOT NULL,
  	"latitude" numeric,
  	"longitude" numeric,
  	"localidade" varchar,
  	"observacoes" varchar,
  	"subtotal" numeric,
  	"status" "enum_pedidos_pimenta_status" DEFAULT 'pendente' NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_kv" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"data" jsonb NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"global_slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer,
  	"media_id" integer,
  	"informes_id" integer,
  	"cardapio_id" integer,
  	"cronologia_id" integer,
  	"pedidos_id" integer,
  	"caixa_id" integer,
  	"produtos_pimenta_id" integer,
  	"pedidos_pimenta_id" integer
  );
  
  CREATE TABLE "payload_preferences" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar,
  	"value" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_preferences_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer
  );
  
  CREATE TABLE "payload_migrations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"batch" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "configuracoes_horarios" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"faixa" varchar,
  	"horario" varchar
  );
  
  CREATE TABLE "configuracoes_taxas_entrega" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"distancia" varchar,
  	"valor" varchar
  );
  
  CREATE TABLE "configuracoes" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"endereco" varchar,
  	"link_mapa" varchar,
  	"whatsapp" varchar,
  	"instagram" varchar,
  	"email" varchar,
  	"chave_pix" varchar,
  	"qr_pix_id" integer,
  	"aviso_retirada" varchar,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  ALTER TABLE "users_sessions" ADD CONSTRAINT "users_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "informes" ADD CONSTRAINT "informes_capa_id_media_id_fk" FOREIGN KEY ("capa_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "informes_locales" ADD CONSTRAINT "informes_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."informes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cardapio_locales" ADD CONSTRAINT "cardapio_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."cardapio"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cronologia" ADD CONSTRAINT "cronologia_ilustracao_id_media_id_fk" FOREIGN KEY ("ilustracao_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pedidos_itens" ADD CONSTRAINT "pedidos_itens_item_id_cardapio_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."cardapio"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pedidos_itens" ADD CONSTRAINT "pedidos_itens_tamanho_id_cardapio_id_fk" FOREIGN KEY ("tamanho_id") REFERENCES "public"."cardapio"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pedidos_itens" ADD CONSTRAINT "pedidos_itens_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pedidos"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "caixa_itens" ADD CONSTRAINT "caixa_itens_item_id_cardapio_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."cardapio"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "caixa_itens" ADD CONSTRAINT "caixa_itens_tamanho_id_cardapio_id_fk" FOREIGN KEY ("tamanho_id") REFERENCES "public"."cardapio"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "caixa_itens" ADD CONSTRAINT "caixa_itens_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."caixa"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "caixa_pagamentos" ADD CONSTRAINT "caixa_pagamentos_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."caixa"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "caixa" ADD CONSTRAINT "caixa_funcionario_id_users_id_fk" FOREIGN KEY ("funcionario_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "produtos_pimenta" ADD CONSTRAINT "produtos_pimenta_imagem_id_media_id_fk" FOREIGN KEY ("imagem_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pedidos_pimenta_itens" ADD CONSTRAINT "pedidos_pimenta_itens_produto_id_produtos_pimenta_id_fk" FOREIGN KEY ("produto_id") REFERENCES "public"."produtos_pimenta"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pedidos_pimenta_itens" ADD CONSTRAINT "pedidos_pimenta_itens_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pedidos_pimenta"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_locked_documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_informes_fk" FOREIGN KEY ("informes_id") REFERENCES "public"."informes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_cardapio_fk" FOREIGN KEY ("cardapio_id") REFERENCES "public"."cardapio"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_cronologia_fk" FOREIGN KEY ("cronologia_id") REFERENCES "public"."cronologia"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_pedidos_fk" FOREIGN KEY ("pedidos_id") REFERENCES "public"."pedidos"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_caixa_fk" FOREIGN KEY ("caixa_id") REFERENCES "public"."caixa"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_produtos_pimenta_fk" FOREIGN KEY ("produtos_pimenta_id") REFERENCES "public"."produtos_pimenta"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_pedidos_pimenta_fk" FOREIGN KEY ("pedidos_pimenta_id") REFERENCES "public"."pedidos_pimenta"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_preferences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "configuracoes_horarios" ADD CONSTRAINT "configuracoes_horarios_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."configuracoes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "configuracoes_taxas_entrega" ADD CONSTRAINT "configuracoes_taxas_entrega_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."configuracoes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "configuracoes" ADD CONSTRAINT "configuracoes_qr_pix_id_media_id_fk" FOREIGN KEY ("qr_pix_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "users_sessions_order_idx" ON "users_sessions" USING btree ("_order");
  CREATE INDEX "users_sessions_parent_id_idx" ON "users_sessions" USING btree ("_parent_id");
  CREATE INDEX "users_updated_at_idx" ON "users" USING btree ("updated_at");
  CREATE INDEX "users_created_at_idx" ON "users" USING btree ("created_at");
  CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");
  CREATE INDEX "media_updated_at_idx" ON "media" USING btree ("updated_at");
  CREATE INDEX "media_created_at_idx" ON "media" USING btree ("created_at");
  CREATE UNIQUE INDEX "media_filename_idx" ON "media" USING btree ("filename");
  CREATE UNIQUE INDEX "informes_slug_idx" ON "informes" USING btree ("slug");
  CREATE INDEX "informes_capa_idx" ON "informes" USING btree ("capa_id");
  CREATE INDEX "informes_updated_at_idx" ON "informes" USING btree ("updated_at");
  CREATE INDEX "informes_created_at_idx" ON "informes" USING btree ("created_at");
  CREATE UNIQUE INDEX "informes_locales_locale_parent_id_unique" ON "informes_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "cardapio_updated_at_idx" ON "cardapio" USING btree ("updated_at");
  CREATE INDEX "cardapio_created_at_idx" ON "cardapio" USING btree ("created_at");
  CREATE UNIQUE INDEX "cardapio_locales_locale_parent_id_unique" ON "cardapio_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "cronologia_ilustracao_idx" ON "cronologia" USING btree ("ilustracao_id");
  CREATE INDEX "cronologia_updated_at_idx" ON "cronologia" USING btree ("updated_at");
  CREATE INDEX "cronologia_created_at_idx" ON "cronologia" USING btree ("created_at");
  CREATE INDEX "pedidos_itens_order_idx" ON "pedidos_itens" USING btree ("_order");
  CREATE INDEX "pedidos_itens_parent_id_idx" ON "pedidos_itens" USING btree ("_parent_id");
  CREATE INDEX "pedidos_itens_item_idx" ON "pedidos_itens" USING btree ("item_id");
  CREATE INDEX "pedidos_itens_tamanho_idx" ON "pedidos_itens" USING btree ("tamanho_id");
  CREATE UNIQUE INDEX "pedidos_codigo_idx" ON "pedidos" USING btree ("codigo");
  CREATE INDEX "pedidos_updated_at_idx" ON "pedidos" USING btree ("updated_at");
  CREATE INDEX "pedidos_created_at_idx" ON "pedidos" USING btree ("created_at");
  CREATE INDEX "caixa_itens_order_idx" ON "caixa_itens" USING btree ("_order");
  CREATE INDEX "caixa_itens_parent_id_idx" ON "caixa_itens" USING btree ("_parent_id");
  CREATE INDEX "caixa_itens_item_idx" ON "caixa_itens" USING btree ("item_id");
  CREATE INDEX "caixa_itens_tamanho_idx" ON "caixa_itens" USING btree ("tamanho_id");
  CREATE INDEX "caixa_pagamentos_order_idx" ON "caixa_pagamentos" USING btree ("_order");
  CREATE INDEX "caixa_pagamentos_parent_id_idx" ON "caixa_pagamentos" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "caixa_codigo_idx" ON "caixa" USING btree ("codigo");
  CREATE INDEX "caixa_funcionario_idx" ON "caixa" USING btree ("funcionario_id");
  CREATE INDEX "caixa_updated_at_idx" ON "caixa" USING btree ("updated_at");
  CREATE INDEX "caixa_created_at_idx" ON "caixa" USING btree ("created_at");
  CREATE INDEX "produtos_pimenta_imagem_idx" ON "produtos_pimenta" USING btree ("imagem_id");
  CREATE INDEX "produtos_pimenta_updated_at_idx" ON "produtos_pimenta" USING btree ("updated_at");
  CREATE INDEX "produtos_pimenta_created_at_idx" ON "produtos_pimenta" USING btree ("created_at");
  CREATE INDEX "pedidos_pimenta_itens_order_idx" ON "pedidos_pimenta_itens" USING btree ("_order");
  CREATE INDEX "pedidos_pimenta_itens_parent_id_idx" ON "pedidos_pimenta_itens" USING btree ("_parent_id");
  CREATE INDEX "pedidos_pimenta_itens_produto_idx" ON "pedidos_pimenta_itens" USING btree ("produto_id");
  CREATE UNIQUE INDEX "pedidos_pimenta_codigo_idx" ON "pedidos_pimenta" USING btree ("codigo");
  CREATE INDEX "pedidos_pimenta_updated_at_idx" ON "pedidos_pimenta" USING btree ("updated_at");
  CREATE INDEX "pedidos_pimenta_created_at_idx" ON "pedidos_pimenta" USING btree ("created_at");
  CREATE UNIQUE INDEX "payload_kv_key_idx" ON "payload_kv" USING btree ("key");
  CREATE INDEX "payload_locked_documents_global_slug_idx" ON "payload_locked_documents" USING btree ("global_slug");
  CREATE INDEX "payload_locked_documents_updated_at_idx" ON "payload_locked_documents" USING btree ("updated_at");
  CREATE INDEX "payload_locked_documents_created_at_idx" ON "payload_locked_documents" USING btree ("created_at");
  CREATE INDEX "payload_locked_documents_rels_order_idx" ON "payload_locked_documents_rels" USING btree ("order");
  CREATE INDEX "payload_locked_documents_rels_parent_idx" ON "payload_locked_documents_rels" USING btree ("parent_id");
  CREATE INDEX "payload_locked_documents_rels_path_idx" ON "payload_locked_documents_rels" USING btree ("path");
  CREATE INDEX "payload_locked_documents_rels_users_id_idx" ON "payload_locked_documents_rels" USING btree ("users_id");
  CREATE INDEX "payload_locked_documents_rels_media_id_idx" ON "payload_locked_documents_rels" USING btree ("media_id");
  CREATE INDEX "payload_locked_documents_rels_informes_id_idx" ON "payload_locked_documents_rels" USING btree ("informes_id");
  CREATE INDEX "payload_locked_documents_rels_cardapio_id_idx" ON "payload_locked_documents_rels" USING btree ("cardapio_id");
  CREATE INDEX "payload_locked_documents_rels_cronologia_id_idx" ON "payload_locked_documents_rels" USING btree ("cronologia_id");
  CREATE INDEX "payload_locked_documents_rels_pedidos_id_idx" ON "payload_locked_documents_rels" USING btree ("pedidos_id");
  CREATE INDEX "payload_locked_documents_rels_caixa_id_idx" ON "payload_locked_documents_rels" USING btree ("caixa_id");
  CREATE INDEX "payload_locked_documents_rels_produtos_pimenta_id_idx" ON "payload_locked_documents_rels" USING btree ("produtos_pimenta_id");
  CREATE INDEX "payload_locked_documents_rels_pedidos_pimenta_id_idx" ON "payload_locked_documents_rels" USING btree ("pedidos_pimenta_id");
  CREATE INDEX "payload_preferences_key_idx" ON "payload_preferences" USING btree ("key");
  CREATE INDEX "payload_preferences_updated_at_idx" ON "payload_preferences" USING btree ("updated_at");
  CREATE INDEX "payload_preferences_created_at_idx" ON "payload_preferences" USING btree ("created_at");
  CREATE INDEX "payload_preferences_rels_order_idx" ON "payload_preferences_rels" USING btree ("order");
  CREATE INDEX "payload_preferences_rels_parent_idx" ON "payload_preferences_rels" USING btree ("parent_id");
  CREATE INDEX "payload_preferences_rels_path_idx" ON "payload_preferences_rels" USING btree ("path");
  CREATE INDEX "payload_preferences_rels_users_id_idx" ON "payload_preferences_rels" USING btree ("users_id");
  CREATE INDEX "payload_migrations_updated_at_idx" ON "payload_migrations" USING btree ("updated_at");
  CREATE INDEX "payload_migrations_created_at_idx" ON "payload_migrations" USING btree ("created_at");
  CREATE INDEX "configuracoes_horarios_order_idx" ON "configuracoes_horarios" USING btree ("_order");
  CREATE INDEX "configuracoes_horarios_parent_id_idx" ON "configuracoes_horarios" USING btree ("_parent_id");
  CREATE INDEX "configuracoes_taxas_entrega_order_idx" ON "configuracoes_taxas_entrega" USING btree ("_order");
  CREATE INDEX "configuracoes_taxas_entrega_parent_id_idx" ON "configuracoes_taxas_entrega" USING btree ("_parent_id");
  CREATE INDEX "configuracoes_qr_pix_idx" ON "configuracoes" USING btree ("qr_pix_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "users_sessions" CASCADE;
  DROP TABLE "users" CASCADE;
  DROP TABLE "media" CASCADE;
  DROP TABLE "informes" CASCADE;
  DROP TABLE "informes_locales" CASCADE;
  DROP TABLE "cardapio" CASCADE;
  DROP TABLE "cardapio_locales" CASCADE;
  DROP TABLE "cronologia" CASCADE;
  DROP TABLE "pedidos_itens" CASCADE;
  DROP TABLE "pedidos" CASCADE;
  DROP TABLE "caixa_itens" CASCADE;
  DROP TABLE "caixa_pagamentos" CASCADE;
  DROP TABLE "caixa" CASCADE;
  DROP TABLE "produtos_pimenta" CASCADE;
  DROP TABLE "pedidos_pimenta_itens" CASCADE;
  DROP TABLE "pedidos_pimenta" CASCADE;
  DROP TABLE "payload_kv" CASCADE;
  DROP TABLE "payload_locked_documents" CASCADE;
  DROP TABLE "payload_locked_documents_rels" CASCADE;
  DROP TABLE "payload_preferences" CASCADE;
  DROP TABLE "payload_preferences_rels" CASCADE;
  DROP TABLE "payload_migrations" CASCADE;
  DROP TABLE "configuracoes_horarios" CASCADE;
  DROP TABLE "configuracoes_taxas_entrega" CASCADE;
  DROP TABLE "configuracoes" CASCADE;
  DROP TYPE "public"."_locales";
  DROP TYPE "public"."enum_users_role";
  DROP TYPE "public"."enum_informes_etiqueta";
  DROP TYPE "public"."enum_cardapio_secao";
  DROP TYPE "public"."enum_pedidos_status";
  DROP TYPE "public"."enum_caixa_pagamentos_forma";
  DROP TYPE "public"."enum_caixa_status";
  DROP TYPE "public"."enum_pedidos_pimenta_modalidade";
  DROP TYPE "public"."enum_pedidos_pimenta_status";`)
}
