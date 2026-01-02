import { DrizzleAdapter } from "@auth/drizzle-adapter";
import Credentials from "@auth/core/providers/credentials";
import Google from "@auth/core/providers/google";
import type { AuthConfig } from "@hono/auth-js";
import { and, eq } from "drizzle-orm";
import { scryptSync, timingSafeEqual } from "node:crypto";

import db from "../db/index";
import {
  account as legacyAccount,
  authAccount,
  authSession,
  authVerificationToken,
  user,
} from "../db/schema";
import env, { parseOrigins } from "../env";

const scryptConfig = {
  N: 16384,
  r: 16,
  p: 1,
  dkLen: 64,
  maxmem: 128 * 16384 * 16 * 2,
};

function verifyPasswordHash(hash: string, password: string) {
  const [saltHex, keyHex] = hash.split(":");
  if (!saltHex || !keyHex) return false;
  const salt = Buffer.from(saltHex, "hex");
  const expected = Buffer.from(keyHex, "hex");
  const actual = scryptSync(
    password.normalize("NFKC"),
    salt,
    scryptConfig.dkLen,
    {
      N: scryptConfig.N,
      r: scryptConfig.r,
      p: scryptConfig.p,
      maxmem: scryptConfig.maxmem,
    }
  );
  if (expected.length !== actual.length) return false;
  return timingSafeEqual(expected, actual);
}

export function getAuthConfig(): AuthConfig {
  const frontendOrigins = parseOrigins(env.FRONTEND_URLS);
  const frontendBase =
    env.NODE_ENV === "production"
      ? "https://www.akumasukitb.com"
      : "http://localhost:4141";
  return {
    secret: env.AUTH_SECRET,
    basePath: "/auth",
    trustHost: true,
    session: { strategy: "database" },
    adapter: DrizzleAdapter(db, {
      usersTable: user,
      accountsTable: authAccount,
      sessionsTable: authSession,
      verificationTokensTable: authVerificationToken,
    }),
    callbacks: {
      async redirect({ url, baseUrl }) {
        if (frontendOrigins.some((origin) => url.startsWith(origin))) return url;
        try {
          const next = new URL(url, baseUrl);
          return `${frontendBase}${next.pathname}${next.search}${next.hash}`;
        } catch {
          return frontendBase;
        }
      },
    },
    providers: [
      Credentials({
        name: "Credentials",
        credentials: {
          email: { label: "Email", type: "text" },
          password: { label: "Password", type: "password" },
        },
        authorize: async (credentials) => {
          const email = credentials?.email?.toString().trim().toLowerCase();
          const password = credentials?.password?.toString();
          if (!email || !password) return null;
          const [userRow] = await db
            .select()
            .from(user)
            .where(eq(user.email, email));
          if (!userRow) return null;
          const [accountRow] = await db
            .select()
            .from(legacyAccount)
            .where(
              and(
                eq(legacyAccount.userId, userRow.id),
                eq(legacyAccount.providerId, "credential")
              )
            );
          if (!accountRow?.password) return null;
          if (!verifyPasswordHash(accountRow.password, password)) return null;
          return {
            id: userRow.id,
            name: userRow.name,
            email: userRow.email,
            image: userRow.image ?? undefined,
          };
        },
      }),
      Google({
        clientId: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
      }),
    ],
  };
}
