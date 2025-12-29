import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const ticketStatusEnum = pgEnum("TicketStatus", [
  "PENDING",
  "CONFIRMED",
]);

export const arrivalWindowEnum = pgEnum("ArrivalWindow", [
  "0910",
  "1011",
  "1112",
  "1300",
  "0000",
]);

export const eventSessionCodeEnum = pgEnum("EventSessionCode", [
  "1",
  "2",
]);

export const userRoleEnum = pgEnum("UserRole", ["USER", "SCANNER"]);

export const user = pgTable(
  "user",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    role: userRoleEnum("role").notNull().default("USER"),
    emailVerified: boolean("emailVerified").notNull().default(false),
    image: text("image"),
    createdAt: timestamp("createdAt", { precision: 3, withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updatedAt", { precision: 3, withTimezone: true })
      .notNull(),
  },
  (table) => [uniqueIndex("user_email_key").on(table.email)]
);

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expiresAt", { precision: 3, withTimezone: true }).notNull(),
    token: text("token").notNull(),
    createdAt: timestamp("createdAt", { precision: 3, withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updatedAt", { precision: 3, withTimezone: true })
      .notNull(),
    ipAddress: text("ipAddress"),
    userAgent: text("userAgent"),
    userId: text("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [
    index("session_userId_idx").on(table.userId),
    uniqueIndex("session_token_key").on(table.token),
  ]
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("accountId").notNull(),
    providerId: text("providerId").notNull(),
    userId: text("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("accessToken"),
    refreshToken: text("refreshToken"),
    idToken: text("idToken"),
    accessTokenExpiresAt: timestamp("accessTokenExpiresAt", {
      precision: 3,
      withTimezone: true,
    }),
    refreshTokenExpiresAt: timestamp("refreshTokenExpiresAt", {
      precision: 3,
      withTimezone: true,
    }),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("createdAt", { precision: 3, withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updatedAt", { precision: 3, withTimezone: true })
      .notNull(),
  },
  (table) => [index("account_userId_idx").on(table.userId)]
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expiresAt", { precision: 3, withTimezone: true }).notNull(),
    createdAt: timestamp("createdAt", { precision: 3, withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updatedAt", { precision: 3, withTimezone: true })
      .notNull(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)]
);

export const order = pgTable("Order", {
  id: text("id").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  totalTickets: integer("totalTickets").notNull(),
  createdAt: timestamp("createdAt", { precision: 3, withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updatedAt", { precision: 3, withTimezone: true }).notNull(),
});

export const attendee = pgTable("Attendee", {
  id: text("id").primaryKey(),
  fullName: text("fullName").notNull(),
  estimatedArrival: arrivalWindowEnum("estimatedArrival").notNull(),
  dietaryNotes: text("dietaryNotes"),
  accessibility: text("accessibility"),
  createdAt: timestamp("createdAt", { precision: 3, withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updatedAt", { precision: 3, withTimezone: true }).notNull(),
});

export const ticket = pgTable(
  "Ticket",
  {
    id: text("id").primaryKey(),
    orderId: text("orderId")
      .notNull()
      .references(() => order.id, { onDelete: "cascade" }),
    attendeeId: text("attendeeId").references(() => attendee.id, {
      onDelete: "set null",
    }),
    ticketType: text("ticketType").notNull(),
    status: ticketStatusEnum("status").notNull().default("PENDING"),
    createdAt: timestamp("createdAt", { precision: 3, withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updatedAt", { precision: 3, withTimezone: true })
      .notNull(),
  },
  (table) => [uniqueIndex("Ticket_attendeeId_key").on(table.attendeeId)]
);

export const eventSession = pgTable(
  "EventSession",
  {
    id: text("id").primaryKey(),
    code: eventSessionCodeEnum("code").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    createdAt: timestamp("createdAt", { precision: 3, withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updatedAt", { precision: 3, withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [uniqueIndex("EventSession_code_key").on(table.code)]
);

export const reservation = pgTable(
  "Reservation",
  {
    id: text("id").primaryKey(),
    userId: text("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    eventSessionId: text("eventSessionId")
      .references(() => eventSession.id, { onDelete: "restrict" }),
    email: text("email").notNull(),
    contactFullName: text("contactFullName").notNull(),
    contactSchool: text("contactSchool").notNull(),
    contactRegion: text("contactRegion").notNull(),
    wantsTalkshow: boolean("wantsTalkshow").notNull(),
    talkshowExpectation: text("talkshowExpectation"),
    barcode: text("barcode").notNull(),
    status: ticketStatusEnum("status").notNull().default("PENDING"),
    createdAt: timestamp("createdAt", { precision: 3, withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updatedAt", { precision: 3, withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("Reservation_barcode_key").on(table.barcode),
    index("Reservation_userId_idx").on(table.userId),
  ]
);

export const reservationParticipant = pgTable(
  "ReservationParticipant",
  {
    id: text("id").primaryKey(),
    reservationId: text("reservationId")
      .notNull()
      .references(() => reservation.id, { onDelete: "cascade" }),
    fullName: text("fullName").notNull(),
    school: text("school").notNull(),
    region: text("region").notNull(),
    createdAt: timestamp("createdAt", { precision: 3, withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updatedAt", { precision: 3, withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("ReservationParticipant_reservationId_idx").on(table.reservationId),
  ]
);

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
  orders: many(order),
  reservations: many(reservation),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));

export const orderRelations = relations(order, ({ many, one }) => ({
  user: one(user, {
    fields: [order.userId],
    references: [user.id],
  }),
  tickets: many(ticket),
}));

export const ticketRelations = relations(ticket, ({ one }) => ({
  order: one(order, {
    fields: [ticket.orderId],
    references: [order.id],
  }),
  attendee: one(attendee, {
    fields: [ticket.attendeeId],
    references: [attendee.id],
  }),
}));

export const attendeeRelations = relations(attendee, ({ many }) => ({
  tickets: many(ticket),
}));

export const eventSessionRelations = relations(eventSession, ({ many }) => ({
  reservations: many(reservation),
}));

export const reservationRelations = relations(reservation, ({ many, one }) => ({
  user: one(user, {
    fields: [reservation.userId],
    references: [user.id],
  }),
  eventSession: one(eventSession, {
    fields: [reservation.eventSessionId],
    references: [eventSession.id],
  }),
  participants: many(reservationParticipant),
}));

export const reservationParticipantRelations = relations(
  reservationParticipant,
  ({ one }) => ({
    reservation: one(reservation, {
      fields: [reservationParticipant.reservationId],
      references: [reservation.id],
    }),
  })
);
