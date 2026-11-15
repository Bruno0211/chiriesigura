CREATE TABLE "demo_listing_edit" (
	"listing_id" text PRIMARY KEY NOT NULL,
	"description" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
