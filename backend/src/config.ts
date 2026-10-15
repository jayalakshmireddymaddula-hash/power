import dotenv from "dotenv";
import { z } from "zod";
import path from "node:path";
import fs from "node:fs";

import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Prioritize workspace-specific apps/api/.env, then current working dir .env
const localApiEnv = path.resolve(__dirname, "../.env");
const cwdEnv = path.resolve(process.cwd(), ".env");
const rootEnv = path.resolve(process.cwd(), "../../.env");

if (fs.existsSync(localApiEnv)) {
  dotenv.config({ path: localApiEnv });
} else if (fs.existsSync(cwdEnv)) {
  dotenv.config({ path: cwdEnv });
} else if (fs.existsSync(rootEnv)) {
  dotenv.config({ path: rootEnv });
} else {
  dotenv.config();
}

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  APP_NAME: z.string().default("FlowPilot AI"),
  APP_URL: z.string().default("http://localhost:5173"),
  API_URL: z.string().default("http://localhost:3000"),
  API_PORT: z.coerce.number().default(Number(process.env.PORT) || 3000),
  PORT: z.coerce.number().optional(),
  LOG_LEVEL: z.string().default("info"),

  // Supabase (Optional)
  SUPABASE_URL: z.string().optional(),
  SUPABASE_ANON_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  SUPABASE_STORAGE_BUCKET: z.string().default("flowpilot-private-documents"),

  // Gemini API
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().default("gemini-2.5-flash"),
  AI_PROVIDER: z.enum(["gemini", "demo"]).default("demo"),
  AI_TIMEOUT_MS: z.coerce.number().default(30000),
  AI_MAX_RETRIES: z.coerce.number().default(2),
  AI_RATE_LIMIT_PER_MINUTE: z.coerce.number().default(20),

  // Database / Queue
  DATABASE_TYPE: z.enum(["sqlite", "postgres"]).default("sqlite"),
  DATABASE_URL: z.string().optional(),
  QUEUE_POLL_INTERVAL_MS: z.coerce.number().default(1000),
  QUEUE_MAX_ATTEMPTS: z.coerce.number().default(5),
  QUEUE_LOCK_DURATION_MS: z.coerce.number().default(60000),

  // Security
  JWT_SECRET: z.string().min(16).default("flowpilot-ai-development-jwt-secret-key-32charsmin!"),
  CORS_ORIGINS: z.string().default("http://localhost:5173,http://localhost:3000"),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(100),
  MAX_REQUEST_BODY_BYTES: z.coerce.number().default(1048576),
  MAX_UPLOAD_BYTES: z.coerce.number().default(10485760),

  // Demo
  DEMO_MODE: z.coerce.boolean().default(true),
  ALLOW_DEMO_SEED: z.coerce.boolean().default(true),

  // Email / Notifications
  EMAIL_PROVIDER: z.string().default("console"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Environment configuration validation failed:", parsed.error.format());
  process.exit(1);
}

export const config = parsed.data;
