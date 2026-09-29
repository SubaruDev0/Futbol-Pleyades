ALTER TYPE "public"."rsvp_status" ADD VALUE 'espectador';--> statement-breakpoint
ALTER TABLE "match_players" ADD COLUMN "spectator_pays" boolean DEFAULT false NOT NULL;