ALTER TABLE "games" ADD COLUMN "turn_order" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "games" ADD COLUMN "turn_index" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "games" ADD COLUMN "turn_deadline" timestamp with time zone;