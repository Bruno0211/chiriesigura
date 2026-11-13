CREATE TABLE "landlord" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phone_hash" text NOT NULL,
	"number_verified_at" timestamp with time zone,
	"kyc_matched_at" timestamp with time zone,
	"sim_checked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "landlord_phone_hash_unique" UNIQUE("phone_hash")
);
--> statement-breakpoint
CREATE TABLE "listing" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"verification_id" uuid NOT NULL,
	"site" text NOT NULL,
	"site_listing_id" text NOT NULL,
	"url" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "listing_site_id" UNIQUE("site","site_listing_id")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"landlord_id" uuid NOT NULL,
	"code" text,
	"address_text" text NOT NULL,
	"lat" double precision NOT NULL,
	"lng" double precision NOT NULL,
	"location_result" text,
	"verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "verification_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "viewing_report" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"verification_id" uuid NOT NULL,
	"listing_id" uuid,
	"reporter_phone_hash" text NOT NULL,
	"location_result" text NOT NULL,
	"category" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "report_once" UNIQUE("verification_id","reporter_phone_hash")
);
--> statement-breakpoint
ALTER TABLE "listing" ADD CONSTRAINT "listing_verification_id_verification_id_fk" FOREIGN KEY ("verification_id") REFERENCES "public"."verification"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verification" ADD CONSTRAINT "verification_landlord_id_landlord_id_fk" FOREIGN KEY ("landlord_id") REFERENCES "public"."landlord"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "viewing_report" ADD CONSTRAINT "viewing_report_verification_id_verification_id_fk" FOREIGN KEY ("verification_id") REFERENCES "public"."verification"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "viewing_report" ADD CONSTRAINT "viewing_report_listing_id_listing_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listing"("id") ON DELETE set null ON UPDATE no action;