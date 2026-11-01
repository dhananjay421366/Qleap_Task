import dotenv from "dotenv";

dotenv.config();

const required = ["DB_HOST", "DB_USER", "DB_PASSWORD", "DB_NAME", "CORS_ORIGINS"];
const missing = required.filter((key) => !process.env[key]?.trim());

if (missing.length > 0) {
  throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
}

const assertPositiveInteger = (key, fallback) => {
  const value = process.env[key] ?? fallback;
  if (!/^\d+$/.test(String(value)) || Number(value) <= 0) {
    throw new Error(`${key} must be a positive integer`);
  }
};

const port = Number(process.env.PORT || 5000);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("PORT must be an integer between 1 and 65535");
}

assertPositiveInteger("RATE_LIMIT_WINDOW_MS", 900000);
assertPositiveInteger("RATE_LIMIT_READ_MAX", process.env.RATE_LIMIT_MAX || 100);
assertPositiveInteger("RATE_LIMIT_WRITE_MAX", process.env.RATE_LIMIT_MAX || 100);

if (process.env.RATE_LIMIT_MAX !== undefined) {
  assertPositiveInteger("RATE_LIMIT_MAX", 100);
}

const origins = process.env.CORS_ORIGINS.split(",").map((origin) => origin.trim());
if (origins.some((origin) => !origin)) {
  throw new Error("CORS_ORIGINS must contain only non-empty origins");
}

for (const origin of origins) {
  let parsed;
  try {
    parsed = new URL(origin);
  } catch {
    throw new Error(`Invalid CORS origin: ${origin}`);
  }

  if (!['http:', 'https:'].includes(parsed.protocol) || parsed.pathname !== "/" ||
      parsed.search || parsed.hash || parsed.username || parsed.password) {
    throw new Error(`Invalid CORS origin: ${origin}`);
  }
}

export default process.env;
