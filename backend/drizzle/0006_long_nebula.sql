CREATE TYPE "public"."inventory_movement_type" AS ENUM('initial', 'restock', 'adjustment', 'sale');--> statement-breakpoint
CREATE TABLE "inventory_movements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"actor_user_id" uuid,
	"type" "inventory_movement_type" NOT NULL,
	"quantity_delta" integer NOT NULL,
	"quantity_before" integer NOT NULL,
	"quantity_after" integer NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "inventory_movements_delta_nonzero" CHECK ("inventory_movements"."quantity_delta" <> 0),
	CONSTRAINT "inventory_movements_before_nonnegative" CHECK ("inventory_movements"."quantity_before" >= 0),
	CONSTRAINT "inventory_movements_after_nonnegative" CHECK ("inventory_movements"."quantity_after" >= 0)
);
--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "inventory_movements_product_created_idx" ON "inventory_movements" USING btree ("product_id","created_at");