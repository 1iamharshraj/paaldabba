import { z } from "zod";
import { and, eq, gte, lte } from "drizzle-orm";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { milkEntries, milkSettings, milkPayments } from "@db/schema";

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
const DATE_RE = /^\d{4}-(0[1-9]|1[0-2])-([0-2]\d|3[01])$/;

async function getOrCreateSettings(userId: number) {
  const db = getDb();
  const existing = await db.query.milkSettings.findFirst({
    where: eq(milkSettings.userId, userId),
  });
  if (existing) return existing;

  await db
    .insert(milkSettings)
    .values({ userId })
    .onDuplicateKeyUpdate({ set: { userId } });
  const created = await db.query.milkSettings.findFirst({
    where: eq(milkSettings.userId, userId),
  });
  return created!;
}

function monthRange(month: string) {
  // month = "YYYY-MM"
  const [y, m] = month.split("-").map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  return { start: `${month}-01`, end: `${month}-${String(lastDay).padStart(2, "0")}` };
}

export function entryCostCents(quantityMl: number, pricePerLiterCents: number) {
  return Math.round((quantityMl * pricePerLiterCents) / 1000);
}

async function getMonthEntries(userId: number, month: string) {
  const { start, end } = monthRange(month);
  return getDb()
    .select()
    .from(milkEntries)
    .where(
      and(
        eq(milkEntries.userId, userId),
        gte(milkEntries.entryDate, start),
        lte(milkEntries.entryDate, end),
      ),
    );
}

export const milkRouter = createRouter({
  /** Get (creating defaults on first use) the caller's milk settings. */
  settings: authedQuery.query(({ ctx }) => getOrCreateSettings(ctx.user.id)),

  updateSettings: authedQuery
    .input(
      z.object({
        pricePerLiterCents: z.number().int().min(0).max(10_000_000),
        currency: z.string().min(1).max(8),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await getOrCreateSettings(ctx.user.id);
      await getDb()
        .update(milkSettings)
        .set({
          pricePerLiterCents: input.pricePerLiterCents,
          currency: input.currency,
        })
        .where(eq(milkSettings.userId, ctx.user.id));
      return getOrCreateSettings(ctx.user.id);
    }),

  /** Log a milk purchase for a given day at the caller's current price. */
  addEntry: authedQuery
    .input(
      z.object({
        entryDate: z.string().regex(DATE_RE),
        quantityMl: z.number().int().min(1).max(100_000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const settings = await getOrCreateSettings(ctx.user.id);
      const [{ id }] = await getDb()
        .insert(milkEntries)
        .values({
          userId: ctx.user.id,
          entryDate: input.entryDate,
          quantityMl: input.quantityMl,
          pricePerLiterCents: settings.pricePerLiterCents,
        })
        .$returningId();
      return getDb().query.milkEntries.findFirst({
        where: eq(milkEntries.id, id),
      });
    }),

  deleteEntry: authedQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await getDb()
        .delete(milkEntries)
        .where(
          and(eq(milkEntries.id, input.id), eq(milkEntries.userId, ctx.user.id)),
        );
      return { ok: true };
    }),

  /** Full month view: entries, per-day rollup, totals, paid status. */
  month: authedQuery
    .input(z.object({ month: z.string().regex(MONTH_RE) }))
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const [entries, payment] = await Promise.all([
        getMonthEntries(ctx.user.id, input.month),
        db.query.milkPayments.findFirst({
          where: and(
            eq(milkPayments.userId, ctx.user.id),
            eq(milkPayments.month, input.month),
          ),
        }),
      ]);

      const daysMap = new Map<string, { ml: number; cents: number }>();
      let totalMl = 0;
      let totalCents = 0;
      for (const e of entries) {
        totalMl += e.quantityMl;
        totalCents += entryCostCents(e.quantityMl, e.pricePerLiterCents);
        const d = daysMap.get(e.entryDate) ?? { ml: 0, cents: 0 };
        d.ml += e.quantityMl;
        d.cents += entryCostCents(e.quantityMl, e.pricePerLiterCents);
        daysMap.set(e.entryDate, d);
      }

      const days = [...daysMap.entries()]
        .map(([date, v]) => ({ date, ...v }))
        .sort((a, b) => a.date.localeCompare(b.date));

      const sortedEntries = [...entries].sort(
        (a, b) =>
          b.entryDate.localeCompare(a.entryDate) ||
          b.createdAt.getTime() - a.createdAt.getTime(),
      );

      return {
        month: input.month,
        entries: sortedEntries,
        days,
        totalMl,
        totalCents,
        daysWithMilk: days.length,
        paid: !!payment,
        paidAt: payment?.paidAt ?? null,
      };
    }),

  /** Mark / unmark a month as settled. Totals are snapshotted when marking paid. */
  setPaid: authedQuery
    .input(z.object({ month: z.string().regex(MONTH_RE), paid: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      if (!input.paid) {
        await db
          .delete(milkPayments)
          .where(
            and(
              eq(milkPayments.userId, ctx.user.id),
              eq(milkPayments.month, input.month),
            ),
          );
        return { paid: false };
      }
      const entries = await getMonthEntries(ctx.user.id, input.month);
      const totalMl = entries.reduce((s, e) => s + e.quantityMl, 0);
      const totalCents = entries.reduce(
        (s, e) => s + entryCostCents(e.quantityMl, e.pricePerLiterCents),
        0,
      );
      await db
        .insert(milkPayments)
        .values({ userId: ctx.user.id, month: input.month, totalMl, totalCents })
        .onDuplicateKeyUpdate({
          set: { totalMl, totalCents, paidAt: new Date() },
        });
      return { paid: true };
    }),

  /** Every month that has entries or a payment, newest first — for history. */
  history: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const [entries, payments] = await Promise.all([
      db
        .select()
        .from(milkEntries)
        .where(eq(milkEntries.userId, ctx.user.id)),
      db
        .select()
        .from(milkPayments)
        .where(eq(milkPayments.userId, ctx.user.id)),
    ]);

    const byMonth = new Map<
      string,
      { totalMl: number; totalCents: number; paid: boolean; paidAt: Date | null }
    >();
    for (const e of entries) {
      const month = e.entryDate.slice(0, 7);
      const cur = byMonth.get(month) ?? {
        totalMl: 0,
        totalCents: 0,
        paid: false,
        paidAt: null,
      };
      cur.totalMl += e.quantityMl;
      cur.totalCents += entryCostCents(e.quantityMl, e.pricePerLiterCents);
      byMonth.set(month, cur);
    }
    for (const p of payments) {
      const cur = byMonth.get(p.month) ?? {
        totalMl: 0,
        totalCents: 0,
        paid: false,
        paidAt: null,
      };
      cur.paid = true;
      cur.paidAt = p.paidAt;
      byMonth.set(p.month, cur);
    }

    return [...byMonth.entries()]
      .map(([month, v]) => ({ month, ...v }))
      .sort((a, b) => b.month.localeCompare(a.month));
  }),
});
