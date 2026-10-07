import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(5000),
  MONGO_URI: z.string().min(1, "MONGO_URI is required"),
  JWT_SECRET: z.string().min(16, "JWT_SECRET must be at least 16 characters"),
  ACCESS_TOKEN_EXPIRES_IN: z.string().default("15m"),
  REFRESH_TOKEN_EXPIRES_IN: z.string().default("7d"),
  CLIENT_URL: z.string().url("CLIENT_URL must be a valid URL"),
  REDIS_URL: z.string().url("REDIS_URL must be a valid URL"),
  EMAIL_FROM: z.string().email("EMAIL_FROM must be a valid email"),
  BREVO_API_KEY: z.string().min(1, "BREVO_API_KEY is required"),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  const issues = parsedEnv.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join(", ");
  throw new Error(`Invalid environment variables: ${issues}`);
}

const value = parsedEnv.data;

export const env = {
  NODE_ENV: value.NODE_ENV,
  PORT: value.PORT,
  MONGO_URI: value.MONGO_URI,
  JWT_SECRET: value.JWT_SECRET,
  ACCESS_TOKEN_EXPIRES_IN: value.ACCESS_TOKEN_EXPIRES_IN,
  REFRESH_TOKEN_EXPIRES_IN: value.REFRESH_TOKEN_EXPIRES_IN,
  CLIENT_URL: value.CLIENT_URL,
  REDIS_URL: value.REDIS_URL,
  EMAIL_FROM: value.EMAIL_FROM,
  BREVO_API_KEY: value.BREVO_API_KEY,
};
