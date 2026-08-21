import {
  pgTable,
  pgEnum,
  serial,
  varchar,
  text,
  timestamp,
  bigint,
  integer,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", ["milkman", "client"]);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  unionId: varchar("unionId", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }),
  email: varchar("email", { length: 320 }),
  /** scrypt password hash (format: salt:hash, hex). */
  passwordHash: text("passwordHash"),
  avatar: text("avatar"),
  role: roleEnum("role").default("client").notNull(),
  milkmanId: bigint("milkmanId", { mode: "number" }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
  lastSignInAt: timestamp("lastSignInAt").defaultNow().notNull(),
},
(t) => ({
  milkmanIdx: index("users_milkman_id_idx").on(t.milkmanId),
}));

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ---- MilkTrack tables ----

/** Per-user configuration: milk price (in currency cents per litre) + currency code. */
export const milkSettings = pgTable(
  "milk_settings",
  {
    id: serial("id").primaryKey(),
    userId: bigint("userId", { mode: "number" }).notNull(),
    pricePerLiterCents: integer("pricePerLiterCents").notNull().default(6000),
    currency: varchar("currency", { length: 8 }).notNull().default("INR"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt")
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (t) => ({
    userIdx: uniqueIndex("milk_settings_user_idx").on(t.userId),
  }),
);

/** A single milk purchase. Price is snapshotted per entry so rate changes don't rewrite history. */
export const milkEntries = pgTable(
  "milk_entries",
  {
    id: serial("id").primaryKey(),
    userId: bigint("userId", { mode: "number" }).notNull(),
    /** Local calendar day, format YYYY-MM-DD */
    entryDate: varchar("entryDate", { length: 10 }).notNull(),
    quantityMl: integer("quantityMl").notNull(),
    /** Snapshot of pricePerLiterCents at the time of purchase */
    pricePerLiterCents: integer("pricePerLiterCents").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (t) => ({
    userDateIdx: index("milk_entries_user_date_idx").on(
      t.userId,
      t.entryDate,
    ),
  }),
);

/** A month marked as paid. Totals are snapshotted at payment time. */
export const milkPayments = pgTable(
  "milk_payments",
  {
    id: serial("id").primaryKey(),
    userId: bigint("userId", { mode: "number" }).notNull(),
    /** Format YYYY-MM */
    month: varchar("month", { length: 7 }).notNull(),
    totalMl: integer("totalMl").notNull(),
    totalCents: integer("totalCents").notNull(),
    paidAt: timestamp("paidAt").defaultNow().notNull(),
  },
  (t) => ({
    userMonthIdx: uniqueIndex("milk_payments_user_month_idx").on(
      t.userId,
      t.month,
    ),
  }),
);

export type MilkSettings = typeof milkSettings.$inferSelect;
export type MilkEntry = typeof milkEntries.$inferSelect;
export type MilkPayment = typeof milkPayments.$inferSelect;
