import dotenv from "dotenv";
dotenv.config();

const {
  PORT = "6868",
  NODE_ENV = "development",
  FRONTEND_URLS,
  DATABASE_URL,
  BETTER_AUTH_SECRET,
  BETTER_AUTH_URL,
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
} = process.env;

export function parseOrigins(...values: Array<string | undefined>) {
  const items = values
    .flatMap((v) => (v ? v.split(",") : []))
    .map((v) => v.trim())
    .filter(Boolean);
  return Array.from(new Set(items));
}

export const env = {
  PORT: Number(PORT),
  NODE_ENV: NODE_ENV as "development" | "production",
  FRONTEND_URLS: FRONTEND_URLS as string,
  DATABASE_URL: DATABASE_URL as string,
  BETTER_AUTH_SECRET: BETTER_AUTH_SECRET as string,
  BETTER_AUTH_URL: BETTER_AUTH_URL as string,
  GOOGLE_CLIENT_ID: GOOGLE_CLIENT_ID as string,
  GOOGLE_CLIENT_SECRET: GOOGLE_CLIENT_SECRET as string,
} as const;

console.log("[ENV] Loaded environment variables:");
console.log("[ENV] PORT:", env.PORT);
console.log("[ENV] NODE_ENV:", env.NODE_ENV);
console.log("[ENV] FRONTEND_URLS:", env.FRONTEND_URLS);
console.log("[ENV] DATABASE_URL:", env.DATABASE_URL ? "✓ Set" : "✗ Missing");
console.log(
  "[ENV] BETTER_AUTH_SECRET:",
  env.BETTER_AUTH_SECRET ? "✓ Set" : "✗ Missing"
);
console.log("[ENV] BETTER_AUTH_URL:", env.BETTER_AUTH_URL);
console.log(
  "[ENV] GOOGLE_CLIENT_ID:",
  env.GOOGLE_CLIENT_ID ? "✓ Set" : "✗ Missing"
);

export default env;
