import dotenv from "dotenv";
dotenv.config();

const {
  PORT = "3000",
  NODE_ENV = "development",
  FRONTEND_URL,
  DATABASE_URL,
  BETTER_AUTH_SECRET,
  BETTER_AUTH_URL,
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
} = process.env;

export const env = {
  PORT: Number(PORT),
  NODE_ENV: NODE_ENV as "development" | "test" | "production",
  FRONTEND_URL: FRONTEND_URL as string,
  DATABASE_URL: DATABASE_URL as string,
  BETTER_AUTH_SECRET: BETTER_AUTH_SECRET as string,
  BETTER_AUTH_URL: BETTER_AUTH_URL as string,
  GOOGLE_CLIENT_ID: GOOGLE_CLIENT_ID as string,
  GOOGLE_CLIENT_SECRET: GOOGLE_CLIENT_SECRET as string,
} as const;

export default env;
