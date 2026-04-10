import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

import { cache } from "react";
import { cookies } from "next/headers";

import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { hashPassword } from "@/lib/password";
import { slugify } from "@/lib/utils";

export { hashPassword, verifyPassword } from "@/lib/password";

/* ---------- Types ---------- */

export interface AppSession {
  userId: string;
  organizationId: string;
  organizationSlug: string;
  email: string;
  name: string;
  role: string;
}

/* ---------- Cookie signing ---------- */

const COOKIE_NAME = "veriload-session";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

function sign(value: string): string {
  const signature = createHmac("sha256", env.SESSION_SECRET).update(value).digest("base64url");
  return `${value}.${signature}`;
}

function verify(signed: string): string | null {
  const lastDot = signed.lastIndexOf(".");
  if (lastDot === -1) return null;
  const value = signed.slice(0, lastDot);
  const expected = sign(value);
  if (expected.length !== signed.length) return null;
  const a = Buffer.from(expected);
  const b = Buffer.from(signed);
  if (a.length !== b.length) return null;
  if (!timingSafeEqual(a, b)) return null;
  return value;
}

/* ---------- Session management ---------- */

export async function createSession(userId: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, sign(userId), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE
  });
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0
  });
}

async function getUserIdFromCookie(): Promise<string | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(COOKIE_NAME)?.value;
  if (!raw) return null;
  return verify(raw);
}

/* ---------- Dev auto-login ---------- */

async function bootstrapDevSession(): Promise<AppSession> {
  const email = env.DEV_USER_EMAIL;
  const orgSlug = slugify(env.DEV_ORG_SLUG);

  const organization = await db.organization.upsert({
    where: { slug: orgSlug },
    update: { name: env.DEV_ORG_NAME },
    create: { name: env.DEV_ORG_NAME, slug: orgSlug }
  });

  const user = await db.user.upsert({
    where: { email },
    update: { name: env.DEV_USER_NAME, organizationId: organization.id, role: "admin" },
    create: {
      email,
      name: env.DEV_USER_NAME,
      organizationId: organization.id,
      role: "admin",
      passwordHash: hashPassword("demo1234")
    }
  });

  // Set the session cookie so subsequent requests are authenticated
  await createSession(user.id);

  return {
    userId: user.id,
    organizationId: organization.id,
    organizationSlug: organization.slug,
    email: user.email,
    name: user.name,
    role: user.role
  };
}

/* ---------- Main session resolver ---------- */

export const getCurrentAppSession = cache(async (): Promise<AppSession> => {
  // Try cookie-based auth first
  const userId = await getUserIdFromCookie();
  if (userId) {
    const user = await db.user.findUnique({
      where: { id: userId },
      include: { organization: true }
    });
    if (user) {
      return {
        userId: user.id,
        organizationId: user.organizationId,
        organizationSlug: user.organization.slug,
        email: user.email,
        name: user.name,
        role: user.role
      };
    }
  }

  // Dev auto-login fallback
  if (env.DEV_AUTO_LOGIN === "true" && process.env.NODE_ENV !== "production") {
    return bootstrapDevSession();
  }

  throw new Error("No authenticated Veriload session.");
});

/**
 * Non-throwing version — used by middleware-adjacent code.
 * Returns null when there is no valid session.
 */
export async function getSessionOrNull(): Promise<AppSession | null> {
  try {
    return await getCurrentAppSession();
  } catch {
    return null;
  }
}
