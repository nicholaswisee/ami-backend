import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

import db from "@/db/index";
import * as schema from "@/db/schema";
import env from "@/env";
import { parseOrigins } from "@/env";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  // Allow requests from the frontend development server
  trustedOrigins: (() => {
    const FrontendOrigins = parseOrigins(env.FRONTEND_URLS);
    if (env.NODE_ENV === "production") return FrontendOrigins;
    return FrontendOrigins.length ? FrontendOrigins : ["*"];
  })(),
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

export type AuthType = {
  user: typeof auth.$Infer.Session.user | null;
  session: typeof auth.$Infer.Session.session | null;
};
