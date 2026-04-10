export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { LogOut, Mail, Shield, Building2, User } from "lucide-react";

import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getCurrentAppSession, destroySession } from "@/lib/auth";

async function logoutAction() {
  "use server";
  await destroySession();
  redirect("/login");
}

export default async function SettingsPage() {
  const session = await getCurrentAppSession();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Account and organization settings"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Settings" }
        ]}
      />

      <div className="grid gap-6 xl:grid-cols-2">
        {/* Profile Card */}
        <Card className="bg-white/90">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[color:var(--accent)]/10">
              <User size={22} className="text-[color:var(--accent)]" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Your Profile</h3>
              <p className="text-sm text-[color:var(--muted)]">Account information</p>
            </div>
          </div>
          <div className="mt-6 space-y-4">
            <div className="flex items-center gap-3 rounded-2xl border border-[color:var(--border)] bg-[color:var(--background)]/50 px-4 py-3">
              <User size={16} className="text-[color:var(--muted)]" />
              <div>
                <p className="text-xs text-[color:var(--muted)]">Name</p>
                <p className="text-sm font-medium">{session.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-[color:var(--border)] bg-[color:var(--background)]/50 px-4 py-3">
              <Mail size={16} className="text-[color:var(--muted)]" />
              <div>
                <p className="text-xs text-[color:var(--muted)]">Email</p>
                <p className="text-sm font-medium">{session.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-[color:var(--border)] bg-[color:var(--background)]/50 px-4 py-3">
              <Shield size={16} className="text-[color:var(--muted)]" />
              <div>
                <p className="text-xs text-[color:var(--muted)]">Role</p>
                <p className="text-sm font-medium capitalize">{session.role}</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Organization Card */}
        <Card className="bg-white/90">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[color:var(--accent)]/10">
              <Building2 size={22} className="text-[color:var(--accent)]" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Organization</h3>
              <p className="text-sm text-[color:var(--muted)]">Workspace details</p>
            </div>
          </div>
          <div className="mt-6 space-y-4">
            <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--background)]/50 px-4 py-3">
              <p className="text-xs text-[color:var(--muted)]">Organization ID</p>
              <p className="mt-0.5 font-mono text-xs text-[color:var(--muted)]">{session.organizationId}</p>
            </div>
            <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--background)]/50 px-4 py-3">
              <p className="text-xs text-[color:var(--muted)]">Slug</p>
              <p className="text-sm font-medium">{session.organizationSlug}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Logout */}
      <Card className="bg-white/90">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold">Session</h3>
            <p className="text-sm text-[color:var(--muted)]">
              Signed in as <strong>{session.email}</strong>
            </p>
          </div>
          <form action={logoutAction}>
            <Button type="submit" variant="danger" className="gap-2">
              <LogOut size={16} />
              Sign out
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
}
