ALTER TABLE "players" DROP CONSTRAINT "players_seat_range";--> statement-breakpoint
ALTER TABLE "players" ADD CONSTRAINT "players_human_seat_range" CHECK ("players"."is_ai" or "players"."seat" <= 5);--> statement-breakpoint
ALTER TABLE "players" ADD CONSTRAINT "players_seat_range" CHECK ("players"."seat" between 1 and 6);