import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  AUTH_SECRET: z.string().min(1),
  AUTH_URL: z.string().url(),
  RUT_SALT: z.string().min(1),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

const _parsed = envSchema.safeParse(process.env);
if (!_parsed.success) {
  console.error("❌ Invalid environment variables:", _parsed.error.format());
  if (process.env.NODE_ENV === "production") throw new Error("Missing required env vars");
}

export const env = _parsed.success ? _parsed.data : (process.env as unknown as z.infer<typeof envSchema>);
