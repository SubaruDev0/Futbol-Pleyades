ALTER TABLE "payment_receipts" ALTER COLUMN "file_key" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "payment_receipts" ALTER COLUMN "content_type" DROP NOT NULL;
