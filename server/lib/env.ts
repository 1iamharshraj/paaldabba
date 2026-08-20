import { config as loadDotenv } from "dotenv";

// Load .env file in non-production environments. On Vercel, env vars are
// injected as process.env and .env is not present, so this is a no-op.
if (process.env.NODE_ENV !== "production") {
  loadDotenv();
}

function createRequired(name: string): () => string {
  let cached: string | undefined;
  return () => {
    if (cached !== undefined) return cached;
    const value = process.env[name];
    if (!value && process.env.NODE_ENV === "production") {
      throw new Error(`Missing required environment variable: ${name}`);
    }
    cached = value ?? "";
    return cached;
  };
}

const appId = createRequired("APP_ID");
const appSecret = createRequired("APP_SECRET");
const databaseUrl = createRequired("DATABASE_URL");

export const env = {
  get appId() {
    return appId();
  },
  get appSecret() {
    return appSecret();
  },
  get isProduction() {
    return process.env.NODE_ENV === "production";
  },
  get databaseUrl() {
    return databaseUrl();
  },
};
