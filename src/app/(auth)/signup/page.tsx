import Link from "next/link";
import { redirect } from "next/navigation";
import { UserPlus } from "lucide-react";

import { createSession, hashPassword } from "@/lib/auth";
import { db } from "@/lib/db";
import { slugify } from "@/lib/utils";
import { SignupForm } from "./signup-form";

async function signupAction(_prev: { error: string | null }, formData: FormData): Promise<{ error: string | null }> {
  "use server";

  const name = (formData.get("name") as string | null)?.trim();
  const email = (formData.get("email") as string | null)?.trim().toLowerCase();
  const password = formData.get("password") as string | null;
  const orgName = (formData.get("organization") as string | null)?.trim();

  if (!name || !email || !password || !orgName) {
    return { error: "All fields are required." };
  }

  if (password.length < 6) {
    return { error: "Password must be at least 6 characters." };
  }

  const existingUser = await db.user.findUnique({ where: { email } });
  if (existingUser) {
    return { error: "An account with this email already exists." };
  }

  const slug = slugify(orgName);
  if (!slug) {
    return { error: "Organization name is invalid." };
  }

  const user = await db.$transaction(async (tx) => {
    const existingOrg = await tx.organization.findUnique({ where: { slug } });
    const organization = existingOrg ?? await tx.organization.create({
      data: {
        name: orgName,
        slug,
        settings: {
          autoApproveEnabled: true,
          autoApproveConfidenceThreshold: 90
        }
      }
    });

    return tx.user.create({
      data: {
        email,
        name,
        passwordHash: hashPassword(password),
        role: existingOrg ? "viewer" : "admin",
        organizationId: organization.id
      }
    });
  });

  await createSession(user.id);
  redirect("/dashboard");
}

export default function SignupPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-10">
      <div className="w-full max-w-lg">
        <div className="rounded-[1.75rem] border border-[color:var(--border)] bg-[color:var(--surface)] p-8 shadow-card">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[color:var(--accent)]/10">
              <UserPlus size={20} className="text-[color:var(--accent)]" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--accent)]">Veriload</p>
              <p className="text-sm text-[color:var(--muted)]">Pilot onboarding</p>
            </div>
          </div>

          <h1 className="mt-6 text-2xl font-bold tracking-tight">Create your workspace</h1>
          <p className="mt-1 text-sm text-[color:var(--muted)]">
            Set up a new organization for freight reconciliation.
          </p>

          <SignupForm action={signupAction} />

          <p className="mt-6 text-center text-sm text-[color:var(--muted)]">
            Already have an account?{" "}
            <Link className="font-medium text-[color:var(--accent)] hover:underline" href="/login">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
