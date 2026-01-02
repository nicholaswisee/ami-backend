import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

import db from "../db/index";
import * as schema from "../db/schema";
import env from "../env";
import { parseOrigins } from "../env";
console.log("[AUTH] Initializing better-auth...");
console.log("[AUTH] baseURL:", env.BETTER_AUTH_URL);

const FrontendOrigins = parseOrigins(env.FRONTEND_URLS);
const trustedOrigins =
  env.NODE_ENV === "production"
    ? FrontendOrigins
    : FrontendOrigins.length
    ? FrontendOrigins
    : ["*"];

console.log("[AUTH] trustedOrigins:", trustedOrigins);
export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  baseURL: env.BETTER_AUTH_URL,
  trustedOrigins,
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    google: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    },
  },
});

console.log("[AUTH] ✓ Better-auth initialized successfully");

export type AuthType = {
  user: typeof auth.$Infer.Session.user | null;
  session: typeof auth.$Infer.Session.session | null;
};
