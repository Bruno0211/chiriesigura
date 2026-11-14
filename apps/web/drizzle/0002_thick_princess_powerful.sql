ALTER TABLE "landlord" ADD COLUMN "id_doc_hash" text;--> statement-breakpoint
ALTER TABLE "landlord" ADD COLUMN "name_birth_hash" text;--> statement-breakpoint
ALTER TABLE "landlord" ADD COLUMN "banned_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "landlord" ADD COLUMN "review_dismissed_at" timestamp with time zone;