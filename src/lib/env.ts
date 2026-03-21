import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().url("DATABASE_URL must be a valid URL"),
  AUTH_SECRET: z.string().min(32, "AUTH_SECRET must be at least 32 chars"),
  RUT_SALT: z.string().min(8, "RUT_SALT must be at least 8 chars"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  AUTH_URL: z.string().url().optional(),
  INTERNAL_API_BASE_URL: z.string().url().optional(),
});

export type Env = z.infer<typeof envSchema>;

let validatedEnv: Env | null = null;

export function validateEnv(): Env {
  if (validatedEnv) return validatedEnv;

  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const issues = result.error.issues.map(i => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`❌ Invalid environment variables:\n${issues}\n\nCheck your .env.local file.`);
  }

  validatedEnv = result.data;
  return validatedEnv;
}
