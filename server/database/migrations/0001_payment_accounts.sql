CREATE TYPE "public"."account_type" AS ENUM('cuenta_rut', 'corriente', 'vista', 'ahorro');--> statement-breakpoint
CREATE TABLE "payment_accounts" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"holder_name" text NOT NULL,
	"rut" text NOT NULL,
	"bank" text NOT NULL,
	"account_type" "account_type" NOT NULL,
	"account_number" text NOT NULL,
	"email" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "payment_accounts" ADD CONSTRAINT "payment_accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "payment_alias";