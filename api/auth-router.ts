import * as cookie from "cookie";
import * as crypto from "crypto";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { Session } from "@contracts/constants";
import { getSessionCookieOptions } from "./lib/cookies";
import {
  createRouter,
  authedQuery,
  milkmanQuery,
  publicQuery,
} from "./middleware";
import { getDb } from "./queries/connection";
import { users } from "@db/schema";
import { eq } from "drizzle-orm";
import { signSessionToken } from "./lib/session";
import { env } from "./lib/env";

// ---- password hashing (scrypt, node:crypto) ----

const SCRYPT_N = 16384;

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, 64, { N: SCRYPT_N });
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [saltHex, hashHex] = stored.split(":");
  if (!saltHex || !hashHex) return false;
  const salt = Buffer.from(saltHex, "hex");
  const expected = Buffer.from(hashHex, "hex");
  const actual = crypto.scryptSync(password, salt, expected.length, {
    N: SCRYPT_N,
  });
  return (
    expected.length === actual.length && crypto.timingSafeEqual(expected, actual)
  );
}

// ---- session cookie helpers ----

function setSessionCookie(
  resHeaders: Headers,
  reqHeaders: Headers,
  unionId: string,
  token: string,
) {
  const opts = getSessionCookieOptions(reqHeaders);
  resHeaders.append(
    "set-cookie",
    cookie.serialize(Session.cookieName, token, {
      httpOnly: opts.httpOnly,
      path: opts.path,
      sameSite: opts.sameSite?.toLowerCase() as "lax" | "none",
      secure: opts.secure,
      maxAge: Math.floor(Session.maxAgeMs / 1000),
    }),
  );
  return unionId;
}

const credentialsSchema = z.object({
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(32, "Username must be at most 32 characters")
    .regex(
      /^[a-zA-Z0-9_.-]+$/,
      "Only letters, numbers, dots, dashes, underscores",
    ),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .max(128),
  displayName: z.string().max(64).optional(),
  role: z.enum(["milkman", "client"]),
  milkmanUsername: z.string().optional(),
});

export const authRouter = createRouter({
  me: authedQuery.query((opts) => opts.ctx.user),

  /** Classic register: username + password → account + session cookie. */
  register: publicQuery
    .input(credentialsSchema)
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const unionId = `local:${input.username.toLowerCase()}`;
      const existing = await db.query.users.findFirst({
        where: eq(users.unionId, unionId),
      });
      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "That username is taken — try another",
        });
      }

      let milkmanId: number | undefined;
      if (input.role === "client" && input.milkmanUsername?.trim()) {
        const milkmanUnionId = `local:${input.milkmanUsername.trim().toLowerCase()}`;
        const milkman = await db.query.users.findFirst({
          where: eq(users.unionId, milkmanUnionId),
        });
        if (!milkman || milkman.role !== "milkman") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "That milkman username was not found",
          });
        }
        milkmanId = milkman.id;
      }

      await db.insert(users).values({
        unionId,
        name: input.displayName?.trim() || input.username,
        passwordHash: hashPassword(input.password),
        role: input.role,
        milkmanId,
      });

      const token = await signSessionToken({ unionId, clientId: env.appId });
      setSessionCookie(ctx.resHeaders, ctx.req.headers, unionId, token);
      return { success: true };
    }),

  /** Classic login: username + password → session cookie. */
  login: publicQuery
    .input(
      credentialsSchema.omit({
        displayName: true,
        role: true,
        milkmanUsername: true,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const unionId = `local:${input.username.toLowerCase()}`;
      const user = await db.query.users.findFirst({
        where: eq(users.unionId, unionId),
      });
      if (
        !user ||
        !user.passwordHash ||
        !verifyPassword(input.password, user.passwordHash)
      ) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Wrong username or password",
        });
      }
      await db
        .update(users)
        .set({ lastSignInAt: new Date() })
        .where(eq(users.id, user.id));

      const token = await signSessionToken({ unionId, clientId: env.appId });
      setSessionCookie(ctx.resHeaders, ctx.req.headers, unionId, token);
      return { success: true };
    }),

  /** Milkman-only: create a new client account linked to the caller. */
  addClient: milkmanQuery
    .input(
      z.object({
        username: z
          .string()
          .min(3, "Username must be at least 3 characters")
          .max(32, "Username must be at most 32 characters")
          .regex(
            /^[a-zA-Z0-9_.-]+$/,
            "Only letters, numbers, dots, dashes, underscores",
          ),
        password: z
          .string()
          .min(6, "Password must be at least 6 characters")
          .max(128),
        displayName: z.string().max(64).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const unionId = `local:${input.username.toLowerCase()}`;
      const existing = await db.query.users.findFirst({
        where: eq(users.unionId, unionId),
      });
      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "That username is taken — try another",
        });
      }

      await db.insert(users).values({
        unionId,
        name: input.displayName?.trim() || input.username,
        passwordHash: hashPassword(input.password),
        role: "client",
        milkmanId: ctx.user.id,
      });

      return { success: true };
    }),

  logout: authedQuery.mutation(async ({ ctx }) => {
    const opts = getSessionCookieOptions(ctx.req.headers);
    ctx.resHeaders.append(
      "set-cookie",
      cookie.serialize(Session.cookieName, "", {
        httpOnly: opts.httpOnly,
        path: opts.path,
        sameSite: opts.sameSite?.toLowerCase() as "lax" | "none",
        secure: opts.secure,
        maxAge: 0,
      }),
    );
    return { success: true };
  }),
});
