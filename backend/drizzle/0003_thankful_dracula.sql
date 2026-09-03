CREATE TYPE "public"."checkout_order_status" AS ENUM('confirmed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('paid', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."vendor_order_status" AS ENUM('placed', 'processing', 'shipped', 'delivered', 'cancelled');--> statement-breakpoint
CREATE TABLE "addresses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"label" varchar(60) DEFAULT 'Delivery' NOT NULL,
	"recipient_name" varchar(160) NOT NULL,
	"phone" varchar(32) NOT NULL,
	"line_1" varchar(200) NOT NULL,
	"line_2" varchar(200),
	"city" varchar(100) NOT NULL,
	"district" varchar(100) NOT NULL,
	"postal_code" varchar(20),
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "checkout_orders" (
	"id" uuid PRIMARY KEY NOT NULL,
	"reference" varchar(32) NOT NULL,
	"idempotency_key" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"address_id" uuid,
	"status" "checkout_order_status" DEFAULT 'confirmed' NOT NULL,
	"recipient_name" varchar(160) NOT NULL,
	"phone" varchar(32) NOT NULL,
	"address_line_1" varchar(200) NOT NULL,
	"address_line_2" varchar(200),
	"city" varchar(100) NOT NULL,
	"district" varchar(100) NOT NULL,
	"postal_code" varchar(20),
	"subtotal_cents" integer NOT NULL,
	"delivery_fee_cents" integer DEFAULT 0 NOT NULL,
	"total_cents" integer NOT NULL,
	"currency" varchar(3) DEFAULT 'LKR' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "checkout_orders_subtotal_nonnegative" CHECK ("checkout_orders"."subtotal_cents" >= 0),
	CONSTRAINT "checkout_orders_delivery_nonnegative" CHECK ("checkout_orders"."delivery_fee_cents" >= 0),
	CONSTRAINT "checkout_orders_total_nonnegative" CHECK ("checkout_orders"."total_cents" >= 0)
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" uuid PRIMARY KEY NOT NULL,
	"vendor_order_id" uuid NOT NULL,
	"product_id" uuid,
	"product_name" varchar(180) NOT NULL,
	"sku" varchar(80) NOT NULL,
	"image_url" text,
	"unit_price_cents" integer NOT NULL,
	"quantity" integer NOT NULL,
	"line_total_cents" integer NOT NULL,
	CONSTRAINT "order_items_price_positive" CHECK ("order_items"."unit_price_cents" > 0),
	CONSTRAINT "order_items_quantity_positive" CHECK ("order_items"."quantity" > 0),
	CONSTRAINT "order_items_total_positive" CHECK ("order_items"."line_total_cents" > 0)
);
--> statement-breakpoint
CREATE TABLE "order_status_history" (
	"id" uuid PRIMARY KEY NOT NULL,
	"vendor_order_id" uuid NOT NULL,
	"actor_user_id" uuid,
	"previous_status" "vendor_order_status",
	"next_status" "vendor_order_status" NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY NOT NULL,
	"checkout_order_id" uuid NOT NULL,
	"method" varchar(40) DEFAULT 'simulated' NOT NULL,
	"status" "payment_status" DEFAULT 'paid' NOT NULL,
	"provider_reference" varchar(80) NOT NULL,
	"amount_cents" integer NOT NULL,
	"currency" varchar(3) DEFAULT 'LKR' NOT NULL,
	"paid_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payments_amount_nonnegative" CHECK ("payments"."amount_cents" >= 0)
);
--> statement-breakpoint
CREATE TABLE "vendor_orders" (
	"id" uuid PRIMARY KEY NOT NULL,
	"checkout_order_id" uuid NOT NULL,
	"vendor_id" uuid NOT NULL,
	"status" "vendor_order_status" DEFAULT 'placed' NOT NULL,
	"subtotal_cents" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "vendor_orders_subtotal_nonnegative" CHECK ("vendor_orders"."subtotal_cents" >= 0)
);
--> statement-breakpoint
ALTER TABLE "addresses" ADD CONSTRAINT "addresses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkout_orders" ADD CONSTRAINT "checkout_orders_customer_id_users_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkout_orders" ADD CONSTRAINT "checkout_orders_address_id_addresses_id_fk" FOREIGN KEY ("address_id") REFERENCES "public"."addresses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_vendor_order_id_vendor_orders_id_fk" FOREIGN KEY ("vendor_order_id") REFERENCES "public"."vendor_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_status_history" ADD CONSTRAINT "order_status_history_vendor_order_id_vendor_orders_id_fk" FOREIGN KEY ("vendor_order_id") REFERENCES "public"."vendor_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_status_history" ADD CONSTRAINT "order_status_history_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_checkout_order_id_checkout_orders_id_fk" FOREIGN KEY ("checkout_order_id") REFERENCES "public"."checkout_orders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_orders" ADD CONSTRAINT "vendor_orders_checkout_order_id_checkout_orders_id_fk" FOREIGN KEY ("checkout_order_id") REFERENCES "public"."checkout_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_orders" ADD CONSTRAINT "vendor_orders_vendor_id_vendor_profiles_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendor_profiles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "addresses_user_id_idx" ON "addresses" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "checkout_orders_reference_unique" ON "checkout_orders" USING btree ("reference");--> statement-breakpoint
CREATE UNIQUE INDEX "checkout_orders_idempotency_key_unique" ON "checkout_orders" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "checkout_orders_customer_id_idx" ON "checkout_orders" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "order_items_vendor_order_id_idx" ON "order_items" USING btree ("vendor_order_id");--> statement-breakpoint
CREATE INDEX "order_status_history_vendor_order_id_idx" ON "order_status_history" USING btree ("vendor_order_id");--> statement-breakpoint
CREATE UNIQUE INDEX "payments_checkout_order_id_unique" ON "payments" USING btree ("checkout_order_id");--> statement-breakpoint
CREATE UNIQUE INDEX "payments_provider_reference_unique" ON "payments" USING btree ("provider_reference");--> statement-breakpoint
CREATE INDEX "vendor_orders_checkout_id_idx" ON "vendor_orders" USING btree ("checkout_order_id");--> statement-breakpoint
CREATE INDEX "vendor_orders_vendor_id_idx" ON "vendor_orders" USING btree ("vendor_id");