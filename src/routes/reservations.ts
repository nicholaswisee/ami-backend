import { and, desc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { randomBytes, randomUUID } from "node:crypto";
import { z } from "zod";
import db from "@/db";
import { eventSession, reservation, reservationParticipant } from "@/db/schema";
import { requireAuth, type AuthVariables } from "@/middleware/requireAuth";
import { ensureDefaultEventSessions } from "@/services/eventSessions";

const router = new Hono<{ Variables: AuthVariables }>({
  strict: false,
});

const participantSchema = z.object({
  fullName: z.string().trim().min(1),
  school: z.string().trim().min(1),
  region: z.string().trim().min(1),
});

const createReservationSchema = z
  .object({
    email: z.string().email(),
    contactFullName: z.string().trim().min(1),
    contactSchool: z.string().trim().min(1),
    contactRegion: z.string().trim().min(1),
    wantsTalkshow: z.boolean(),
    talkshowExpectation: z.string().trim().optional(),
    sessionCode: z.enum(["1", "2"]).optional(),
    participants: z.array(participantSchema).min(1),
  })
  .superRefine((value, ctx) => {
    if (value.wantsTalkshow && !value.talkshowExpectation?.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["talkshowExpectation"],
        message: "Talkshow expectation is required when wantsTalkshow is true",
      });
    }
    if (value.wantsTalkshow && !value.sessionCode) {
      ctx.addIssue({
        code: "custom",
        path: ["sessionCode"],
        message: "Session is required when wantsTalkshow is true",
      });
    }
  });

type DbSelectLike = {
  select: typeof db.select;
};

async function generateUniqueBarcode(executor: DbSelectLike = db) {
  for (let attempt = 0; attempt < 6; attempt++) {
    const candidate = `AMI26-${randomBytes(6)
      .toString("hex")
      .toUpperCase()}`;

    const existing = await executor
      .select({ id: reservation.id })
      .from(reservation)
      .where(eq(reservation.barcode, candidate))
      .limit(1);

    if (existing.length === 0) return candidate;
  }
  throw new Error("FAILED_TO_GENERATE_BARCODE");
}

router.post("/reservations", requireAuth, async (c) => {
  await ensureDefaultEventSessions(db);

  const body = await c.req.json().catch(() => null);
  const parsed = createReservationSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      { error: "VALIDATION_ERROR", issues: parsed.error.issues },
      400,
    );
  }

  const authUserId = c.get("authUserId");

  try {
    const result = await db.transaction(async (tx) => {
      const sessionRow = parsed.data.wantsTalkshow
        ? (
            await tx
              .select({
                id: eventSession.id,
                code: eventSession.code,
                name: eventSession.name,
                description: eventSession.description,
              })
              .from(eventSession)
              .where(eq(eventSession.code, parsed.data.sessionCode!))
              .limit(1)
          )[0]
        : null;

      if (parsed.data.wantsTalkshow && !sessionRow) {
        return { error: "SESSION_NOT_FOUND" as const };
      }

      const reservationId = randomUUID();
      const barcode = await generateUniqueBarcode(tx as unknown as DbSelectLike);

      const [createdReservation] = await tx
        .insert(reservation)
        .values({
          id: reservationId,
          userId: authUserId,
          eventSessionId: sessionRow?.id ?? null,
          email: parsed.data.email,
          contactFullName: parsed.data.contactFullName,
          contactSchool: parsed.data.contactSchool,
          contactRegion: parsed.data.contactRegion,
          wantsTalkshow: parsed.data.wantsTalkshow,
          talkshowExpectation: parsed.data.wantsTalkshow
            ? parsed.data.talkshowExpectation?.trim() || null
            : null,
          barcode,
        })
        .returning();

      const participants = await tx
        .insert(reservationParticipant)
        .values(
          parsed.data.participants.map((p) => ({
            id: randomUUID(),
            reservationId: createdReservation.id,
            fullName: p.fullName,
            school: p.school,
            region: p.region,
          })),
        )
        .returning({
          id: reservationParticipant.id,
          fullName: reservationParticipant.fullName,
          school: reservationParticipant.school,
          region: reservationParticipant.region,
        });

      return {
        reservation: createdReservation,
        participants,
        session: sessionRow,
      };
    });

    if ("error" in result) {
      return c.json({ error: result.error }, 404);
    }

    return c.json(
      {
        reservation: {
          ...result.reservation,
          session: result.session,
          participants: result.participants,
        },
      },
      201,
    );
  } catch (error: any) {
    if (error?.code === "23505") {
      return c.json(
        {
          error: "CONFLICT",
          message:
            "Email already reserved for this session or barcode collision.",
        },
        409,
      );
    }
    throw error;
  }
});

router.get("/reservations", requireAuth, async (c) => {
  await ensureDefaultEventSessions(db);
  const authUserId = c.get("authUserId");

  const rows = await db
    .select({
      id: reservation.id,
      email: reservation.email,
      contactFullName: reservation.contactFullName,
      contactSchool: reservation.contactSchool,
      contactRegion: reservation.contactRegion,
      wantsTalkshow: reservation.wantsTalkshow,
      talkshowExpectation: reservation.talkshowExpectation,
      barcode: reservation.barcode,
      status: reservation.status,
      createdAt: reservation.createdAt,
      sessionId: eventSession.id,
      sessionCode: eventSession.code,
      sessionName: eventSession.name,
      sessionDescription: eventSession.description,
    })
    .from(reservation)
    .leftJoin(eventSession, eq(reservation.eventSessionId, eventSession.id))
    .where(eq(reservation.userId, authUserId))
    .orderBy(desc(reservation.createdAt));

  const reservations = rows.map((row) => ({
    id: row.id,
    email: row.email,
    contactFullName: row.contactFullName,
    contactSchool: row.contactSchool,
    contactRegion: row.contactRegion,
    wantsTalkshow: row.wantsTalkshow,
    talkshowExpectation: row.talkshowExpectation,
    barcode: row.barcode,
    status: row.status,
    createdAt: row.createdAt,
    session: row.sessionId
      ? {
          id: row.sessionId,
          code: row.sessionCode!,
          name: row.sessionName!,
          description: row.sessionDescription ?? null,
        }
      : null,
  }));

  return c.json({ reservations });
});

router.get("/reservations/:id", requireAuth, async (c) => {
  await ensureDefaultEventSessions(db);

  const authUserId = c.get("authUserId");
  const id = c.req.param("id");

  const [row] = await db
    .select({
      id: reservation.id,
      email: reservation.email,
      contactFullName: reservation.contactFullName,
      contactSchool: reservation.contactSchool,
      contactRegion: reservation.contactRegion,
      wantsTalkshow: reservation.wantsTalkshow,
      talkshowExpectation: reservation.talkshowExpectation,
      barcode: reservation.barcode,
      status: reservation.status,
      createdAt: reservation.createdAt,
      sessionId: eventSession.id,
      sessionCode: eventSession.code,
      sessionName: eventSession.name,
      sessionDescription: eventSession.description,
    })
    .from(reservation)
    .leftJoin(eventSession, eq(reservation.eventSessionId, eventSession.id))
    .where(and(eq(reservation.id, id), eq(reservation.userId, authUserId)))
    .limit(1);

  if (!row) return c.json({ error: "NOT_FOUND" }, 404);

  const participants = await db
    .select({
      id: reservationParticipant.id,
      fullName: reservationParticipant.fullName,
      school: reservationParticipant.school,
      region: reservationParticipant.region,
    })
    .from(reservationParticipant)
    .where(eq(reservationParticipant.reservationId, row.id))
    .orderBy(desc(reservationParticipant.createdAt));

  return c.json({
    reservation: {
      id: row.id,
      email: row.email,
      contactFullName: row.contactFullName,
      contactSchool: row.contactSchool,
      contactRegion: row.contactRegion,
      wantsTalkshow: row.wantsTalkshow,
      talkshowExpectation: row.talkshowExpectation,
      barcode: row.barcode,
      status: row.status,
      createdAt: row.createdAt,
      session: row.sessionId
        ? {
            id: row.sessionId,
            code: row.sessionCode!,
            name: row.sessionName!,
            description: row.sessionDescription ?? null,
          }
        : null,
      participants,
    },
  });
});

export default router;
