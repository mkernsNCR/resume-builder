import { z } from "zod";

export const envSchema = z
  .object({
    DATABASE_URL: z
      .string()
      .min(1, "DATABASE_URL is required")
      .url("DATABASE_URL must be a valid URL"),
    PORT: z.coerce.number().int().positive().default(5000),
    NODE_ENV: z
      .enum(["development", "production", "test"])
      .default("development"),
    SESSION_SECRET: z
      .string()
      .min(32, "SESSION_SECRET must be at least 32 characters")
      .optional(),
  })
  .superRefine((value, context) => {
    if (value.NODE_ENV !== "test" && !value.SESSION_SECRET) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["SESSION_SECRET"],
        message: "SESSION_SECRET is required outside tests",
      });
    }
  });

export type Env = z.infer<typeof envSchema>;

function parseEnv(): Env {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error("Environment variable validation failed:");
    for (const issue of result.error.issues) {
      console.error(`  ${issue.path.join(".")}: ${issue.message}`);
    }
    process.exit(1);
  }

  return result.data;
}

export const env = parseEnv();
