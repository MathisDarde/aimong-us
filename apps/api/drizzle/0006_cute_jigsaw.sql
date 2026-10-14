ALTER TYPE "public"."game_status" ADD VALUE 'results' BEFORE 'finished';--> statement-breakpoint
ALTER TABLE "games" ADD COLUMN "theme" text;--> statement-breakpoint
ALTER TABLE "games" ADD COLUMN "last_eliminated_id" uuid;--> statement-breakpoint
ALTER TABLE "games" ADD CONSTRAINT "games_last_eliminated_id_players_id_fk" FOREIGN KEY ("last_eliminated_id") REFERENCES "public"."players"("id") ON DELETE set null ON UPDATE no action;