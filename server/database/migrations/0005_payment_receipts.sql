CREATE TYPE "public"."receipt_status" AS ENUM('pendiente', 'aceptado', 'rechazado');--> statement-breakpoint
CREATE TABLE "payment_receipts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"match_player_id" uuid NOT NULL,
	"uploaded_by" uuid,
	"file_key" text NOT NULL,
	"content_type" text NOT NULL,
	"status" "receipt_status" DEFAULT 'pendiente' NOT NULL,
	"reject_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reviewed_at" timestamp with time zone,
	"reviewed_by" uuid
);
--> statement-breakpoint
ALTER TABLE "payment_receipts" ADD CONSTRAINT "payment_receipts_match_player_id_match_players_id_fk" FOREIGN KEY ("match_player_id") REFERENCES "public"."match_players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_receipts" ADD CONSTRAINT "payment_receipts_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_receipts" ADD CONSTRAINT "payment_receipts_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "payment_receipts_one_pending" ON "payment_receipts" USING btree ("match_player_id") WHERE "payment_receipts"."status" = 'pendiente';