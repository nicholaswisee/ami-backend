import { eq } from "drizzle-orm";
import type { MiddlewareHandler } from "hono";
import db from "@/db";
import { scannerAllowlist, user } from "@/db/schema";
import type { AuthVariables } from "@/middleware/requireAuth";

const normalizeEmail = (value: string) => value.trim().toLowerCase();
const ALWAYS_ALLOWED_EMAILS = new Set(["jasonedwardsalim@gmail.com"]);

export const hasScannerAccess = async (email: string) => {
  const normalized = normalizeEmail(email);
  if (ALWAYS_ALLOWED_EMAILS.has(normalized)) return true;
  const [row] = await db
    .select({ email: scannerAllowlist.email })
    .from(scannerAllowlist)
    .where(eq(scannerAllowlist.email, normalized))
    .limit(1);

  return Boolean(row);
};

export const requireScanner: MiddlewareHandler<{ Variables: AuthVariables }> =
  async (c, next) => {
    const authUserId = c.get("authUserId");

    const [row] = await db
      .select({ email: user.email })
      .from(user)
      .where(eq(user.id, authUserId))
      .limit(1);

    if (!row) return c.json({ error: "UNAUTHORIZED" }, 401);
    const allowed = await hasScannerAccess(row.email);
    if (!allowed) return c.json({ error: "FORBIDDEN" }, 403);

    await next();
  };
