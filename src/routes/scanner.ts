import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import db from "@/db";
import { reservation, user } from "@/db/schema";
import { requireAuth, type AuthVariables } from "@/middleware/requireAuth";
import { hasScannerAccess, requireScanner } from "@/middleware/requireScanner";
import { sql } from "drizzle-orm";

const router = new Hono<{ Variables: AuthVariables }>({
  strict: false,
});

const scanSchema = z.object({
  barcode: z.string().trim().min(1),
});

router.get("/scanner/access", requireAuth, async (c) => {
  const authUserId = c.get("authUserId");
  const [row] = await db
    .select({ email: user.email })
    .from(user)
    .where(eq(user.id, authUserId))
    .limit(1);

  if (!row) return c.json({ error: "UNAUTHORIZED" }, 401);
  const allowed = await hasScannerAccess(row.email);
  return c.json({ allowed });
});

router.post("/scanner/scan", requireAuth, requireScanner, async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = scanSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      { error: "VALIDATION_ERROR", issues: parsed.error.issues },
      400,
    );
  }

  const barcode = parsed.data.barcode;

  const [row] = await db
    .update(reservation)
    .set({ status: "CONFIRMED", updatedAt: sql`now()` })
    .where(and(eq(reservation.barcode, barcode), eq(reservation.status, "PENDING")))
    .returning({
      id: reservation.id,
      barcode: reservation.barcode,
      status: reservation.status,
      email: reservation.email,
      contactFullName: reservation.contactFullName,
      eventSessionId: reservation.eventSessionId,
    });

  if (row) return c.json({ reservation: row });

  const [existing] = await db
    .select({
      id: reservation.id,
      barcode: reservation.barcode,
      status: reservation.status,
      email: reservation.email,
      contactFullName: reservation.contactFullName,
      eventSessionId: reservation.eventSessionId,
    })
    .from(reservation)
    .where(eq(reservation.barcode, barcode))
    .limit(1);

  if (!existing) return c.json({ error: "NOT_FOUND" }, 404);
  return c.json({ reservation: existing });
});

export default router;
