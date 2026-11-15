CREATE TABLE "report_case" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"report_id" uuid NOT NULL,
	"landlord_id" uuid NOT NULL,
	"status" text NOT NULL,
	"decided_at" timestamp with time zone,
	"decided_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "report_case_report_id_unique" UNIQUE("report_id")
);
--> statement-breakpoint
CREATE TABLE "reporter_bar" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" text NOT NULL,
	"hash" text NOT NULL,
	"case_id" uuid,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bar_once" UNIQUE("kind","hash")
);
--> statement-breakpoint
ALTER TABLE "viewing_report" ADD COLUMN "reporter_account_hash" text;--> statement-breakpoint
ALTER TABLE "viewing_report" ADD COLUMN "sim_swapped" boolean;--> statement-breakpoint
ALTER TABLE "report_case" ADD CONSTRAINT "report_case_report_id_viewing_report_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."viewing_report"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_case" ADD CONSTRAINT "report_case_landlord_id_landlord_id_fk" FOREIGN KEY ("landlord_id") REFERENCES "public"."landlord"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reporter_bar" ADD CONSTRAINT "reporter_bar_case_id_report_case_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."report_case"("id") ON DELETE set null ON UPDATE no action;