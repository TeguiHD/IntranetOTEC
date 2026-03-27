CREATE TABLE "push_subscriptions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "alumno_id" uuid NOT NULL REFERENCES "usuarios"("id"),
  "endpoint" text NOT NULL UNIQUE,
  "p256dh" text NOT NULL,
  "auth" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now()
);--> statement-breakpoint

CREATE INDEX "push_sub_alumno_idx" ON "push_subscriptions" USING btree ("alumno_id");
