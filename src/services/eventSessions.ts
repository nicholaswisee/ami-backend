import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import db from "@/db";
import { eventSession, eventSessionCodeEnum } from "@/db/schema";

export type EventSessionCode = (typeof eventSessionCodeEnum.enumValues)[number];

const DefaultSessions: Array<{
  code: EventSessionCode;
  name: string;
  description: string;
}> = [
  {
    code: "1",
    name: "Sesi 1",
    description: "Reservasi Tiket ITB DAY AMI 2026 - Session 1",
  },
  {
    code: "2",
    name: "Sesi 2",
    description: "Reservasi Tiket ITB DAY AMI 2026 - Session 2",
  },
];

export async function ensureDefaultEventSessions(database: typeof db) {
  for (const session of DefaultSessions) {
    const existing = await database
      .select({ id: eventSession.id })
      .from(eventSession)
      .where(eq(eventSession.code, session.code))
      .limit(1);

    if (existing.length > 0) continue;

    await database.insert(eventSession).values({
      id: randomUUID(),
      code: session.code,
      name: session.name,
      description: session.description,
    });
  }
}
