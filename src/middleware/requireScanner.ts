import { eq } from "drizzle-orm";
import type { MiddlewareHandler } from "hono";
import db from "@/db";
import { user } from "@/db/schema";
import type { AuthVariables } from "@/middleware/requireAuth";

export const requireScanner: MiddlewareHandler<{ Variables: AuthVariables }> =
  async (c, next) => {
    const authUserId = c.get("authUserId");

    const [row] = await db
      .select({ role: user.role })
      .from(user)
      .where(eq(user.id, authUserId))
      .limit(1);

    if (!row) return c.json({ error: "UNAUTHORIZED" }, 401);
    if (row.role !== "SCANNER") return c.json({ error: "FORBIDDEN" }, 403);

    await next();
  };

