import Link from "next/link";
import { redirect } from "next/navigation";
import { LogIn } from "lucide-react";

import { createSession, verifyPassword } from "@/lib/auth";
import { db } from "@/lib/db";
import { LoginForm } from "./login-form";

async function loginAction(_prev: { error: string | null }, formData: FormData): Promise<{ error: string | null }> {
  "use server";

  const email = (formData.get("email") as string | null)?.trim().toLowerCase();
  const password = formData.get("password") as string | null;

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  const user = await db.user.findUnique({ where: { email } });

  if (!user || !user.passwordHash) {
    return { error: "Invalid email or password." };
  }

  if (!verifyPassword(password, user.passwordHash)) {
    return { error: "Invalid email or password." };
  }

  await createSession(user.id);
  redirect("/dashboard");
}

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-10">
      <div className="w-full max-w-md">
        <div className="rounded-[1.75rem] border border-[color:var(--border)] bg-[color:var(--surface)] p-8 shadow-card">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[color:var(--accent)]/10">
              <LogIn size={20} className="text-[color:var(--accent)]" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--accent)]">Veriload</p>
              <p className="text-sm text-[color:var(--muted)]">Freight reconciliation</p>
            </div>
          </div>

          <h1 className="mt-6 text-2xl font-bold tracking-tight">Sign in to your account</h1>
          <p className="mt-1 text-sm text-[color:var(--muted)]">
            Enter your credentials to access the ops dashboard.
          </p>

          <LoginForm action={loginAction} />

          <p className="mt-6 text-center text-sm text-[color:var(--muted)]">
            Need an account?{" "}
            <Link className="font-medium text-[color:var(--accent)] hover:underline" href="/signup">
              Create one
            </Link>
          </p>
        </div>

        <p className="mt-4 text-center text-xs text-[color:var(--muted)]">
          Demo: demo@acme.com / demo1234
        </p>
      </div>
    </main>
  );
}
