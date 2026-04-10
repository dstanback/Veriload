import { NextResponse, type NextRequest } from "next/server";

const COOKIE_NAME = "veriload-session";

function getSecret(): string {
  return process.env.SESSION_SECRET ?? "veriload-dev-secret-change-in-production";
}

async function hmacSign(value: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  // base64url encode
  const bytes = new Uint8Array(sig);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function verifyCookie(signed: string): Promise<boolean> {
  const lastDot = signed.lastIndexOf(".");
  if (lastDot === -1) return false;
  const value = signed.slice(0, lastDot);
  const providedSig = signed.slice(lastDot + 1);
  const expectedSig = await hmacSign(value, getSecret());
  if (expectedSig.length !== providedSig.length) return false;
  // constant-time comparison via subtle
  const encoder = new TextEncoder();
  const a = encoder.encode(expectedSig);
  const b = encoder.encode(providedSig);
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a[i] ^ b[i];
  }
  return mismatch === 0;
}

function isDevAutoLogin(): boolean {
  return process.env.DEV_AUTO_LOGIN === "true" && process.env.NODE_ENV !== "production";
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes
  if (
    pathname === "/" ||
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname.startsWith("/api/")
  ) {
    return NextResponse.next();
  }

  // Dev auto-login bypass — let auth.ts handle the upsert
  if (isDevAutoLogin()) {
    return NextResponse.next();
  }

  // Check for valid session cookie on /dashboard/* routes
  const cookie = request.cookies.get(COOKIE_NAME)?.value;
  if (!cookie || !(await verifyCookie(cookie))) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"]
};
