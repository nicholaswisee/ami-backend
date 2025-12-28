import { asc } from "drizzle-orm";
import { Hono } from "hono";
import db from "@/db";
import { eventSession } from "@/db/schema";
import { ensureDefaultEventSessions } from "@/services/eventSessions";

const router = new Hono({
  strict: false,
});

router.get("/sessions", async (c) => {
  await ensureDefaultEventSessions(db);

  const sessions = await db
    .select({
      id: eventSession.id,
      code: eventSession.code,
      name: eventSession.name,
      description: eventSession.description,
    })
    .from(eventSession)
    .orderBy(asc(eventSession.code));

  return c.json({ sessions });
});

export default router;

