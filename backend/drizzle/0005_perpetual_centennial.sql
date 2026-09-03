CREATE TYPE "public"."complaint_status" AS ENUM('open', 'in_review', 'resolved', 'dismissed');--> statement-breakpoint
CREATE TYPE "public"."review_status" AS ENUM('pending', 'published', 'rejected');--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'complaint_update';--> statement-breakpoint
CREATE TABLE "complaints" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid NOT NULL,
	"checkout_order_id" uuid NOT NULL,
	"subject" varchar(160) NOT NULL,
	"description" text NOT NULL,
	"status" "complaint_status" DEFAULT 'open' NOT NULL,
	"resolution_note" text,
	"handled_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"order_item_id" uuid NOT NULL,
	"rating" integer NOT NULL,
	"comment" text NOT NULL,
	"status" "review_status" DEFAULT 'pending' NOT NULL,
	"moderated_by" uuid,
	"moderated_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reviews_rating_range" CHECK ("reviews"."rating" >= 1 AND "reviews"."rating" <= 5)
);
--> statement-breakpoint
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_customer_id_users_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_checkout_order_id_checkout_orders_id_fk" FOREIGN KEY ("checkout_order_id") REFERENCES "public"."checkout_orders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_handled_by_users_id_fk" FOREIGN KEY ("handled_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_customer_id_users_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_order_item_id_order_items_id_fk" FOREIGN KEY ("order_item_id") REFERENCES "public"."order_items"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_moderated_by_users_id_fk" FOREIGN KEY ("moderated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "complaints_customer_id_idx" ON "complaints" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "complaints_status_created_at_idx" ON "complaints" USING btree ("status","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "reviews_customer_product_unique" ON "reviews" USING btree ("customer_id","product_id");--> statement-breakpoint
CREATE UNIQUE INDEX "reviews_order_item_unique" ON "reviews" USING btree ("order_item_id");--> statement-breakpoint
CREATE INDEX "reviews_product_status_idx" ON "reviews" USING btree ("product_id","status");