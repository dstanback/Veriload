"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  Bell,
  Loader2,
  Plus,
  RotateCcw,
  Save,
  Settings,
  Shield,
  Trash2,
  User,
  Users,
  X,
  Zap,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { startTransition, useCallback, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { cn, formatDate } from "@/lib/utils";
import {
  createTeamMember,
  removeTeamMember,
  updateOrgSettings,
} from "@/app/dashboard/settings/actions";
import {
  DEFAULT_TOLERANCES,
  type SettingsPageData,
  type TeamMember,
  type Tolerances,
} from "@/app/dashboard/settings/settings-types";

/* ------------------------------------------------------------------ */
/*  Tab definitions                                                   */
/* ------------------------------------------------------------------ */

const TABS = [
  { id: "profile", label: "Profile", icon: User },
  { id: "tolerances", label: "Tolerances", icon: Settings },
  { id: "auto-approve", label: "Auto-Approve", icon: Zap },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "team", label: "Team", icon: Users },
] as const;

type TabId = (typeof TABS)[number]["id"];

/* ------------------------------------------------------------------ */
/*  Root component                                                    */
/* ------------------------------------------------------------------ */

export function SettingsTabs({ data }: { data: SettingsPageData }) {
  const [activeTab, setActiveTab] = useState<TabId>("profile");

  return (
    <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
      {/* Vertical tab nav */}
      <Card className="flex flex-row gap-1 bg-white/90 p-3 lg:flex-col">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2.5 rounded-xl px-4 py-2.5 text-left text-sm font-medium transition",
                active
                  ? "bg-[color:var(--foreground)] text-white"
                  : "text-[color:var(--muted)] hover:bg-black/5"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {tab.label}
            </button>
          );
        })}
      </Card>

      {/* Tab content */}
      <div className="min-w-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
          >
            {activeTab === "profile" && <ProfileTab data={data} />}
            {activeTab === "tolerances" && <TolerancesTab data={data} />}
            {activeTab === "auto-approve" && <AutoApproveTab data={data} />}
            {activeTab === "notifications" && <NotificationsTab data={data} />}
            {activeTab === "team" && <TeamTab data={data} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Profile tab                                                       */
/* ------------------------------------------------------------------ */

function ProfileTab({ data }: { data: SettingsPageData }) {
  return (
    <Card className="space-y-5 bg-white/90">
      <h3 className="text-lg font-semibold">Your profile</h3>
      <div className="space-y-3">
        <div>
          <label className="mb-1.5 block text-xs uppercase tracking-[0.2em] text-[color:var(--muted)]">
            Name
          </label>
          <Input value={data.session.name} readOnly />
        </div>
        <div>
          <label className="mb-1.5 block text-xs uppercase tracking-[0.2em] text-[color:var(--muted)]">
            Email
          </label>
          <Input value={data.session.email} readOnly />
        </div>
        <div>
          <label className="mb-1.5 block text-xs uppercase tracking-[0.2em] text-[color:var(--muted)]">
            Role
          </label>
          <Badge tone="neutral" className="mt-1">
            {data.session.role}
          </Badge>
        </div>
      </div>
      <hr className="border-[color:var(--border)]" />
      <div>
        <h4 className="text-sm font-semibold">Organization</h4>
        <p className="mt-1 text-sm text-[color:var(--muted)]">
          {data.organization.name}{" "}
          <span className="text-xs">({data.organization.slug})</span>
        </p>
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Tolerance preview bar                                             */
/* ------------------------------------------------------------------ */

function ToleranceBar({
  greenMax,
  yellowMax,
  unit,
}: {
  greenMax: number;
  yellowMax: number;
  unit: string;
}) {
  const total = yellowMax * 1.5 || 10;
  const greenPct = (greenMax / total) * 100;
  const yellowPct = ((yellowMax - greenMax) / total) * 100;
  const redPct = 100 - greenPct - yellowPct;

  return (
    <div className="space-y-1.5">
      <div className="flex h-3 w-full overflow-hidden rounded-full">
        {greenPct > 0 && (
          <div
            className="bg-emerald-400"
            style={{ width: `${greenPct}%` }}
          />
        )}
        <div
          className="bg-amber-400"
          style={{ width: `${Math.max(yellowPct, 2)}%` }}
        />
        <div className="flex-1 bg-rose-400" />
      </div>
      <div className="flex justify-between text-[10px] text-[color:var(--muted)]">
        <span>
          Green &lt; {greenMax}
          {unit}
        </span>
        <span>
          Yellow {greenMax}–{yellowMax}
          {unit}
        </span>
        <span>
          Red &gt; {yellowMax}
          {unit}
        </span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Tolerances tab                                                    */
/* ------------------------------------------------------------------ */

interface ToleranceField {
  key: keyof Tolerances;
  label: string;
  unit: string;
  step: string;
  pairedGreen?: keyof Tolerances;
  pairedYellow?: keyof Tolerances;
}

const TOLERANCE_GROUPS: {
  label: string;
  greenKey: keyof Tolerances;
  yellowKey: keyof Tolerances;
  unit: string;
  step: string;
}[] = [
  {
    label: "Total Amount Variance",
    greenKey: "totalAmountGreen",
    yellowKey: "totalAmountYellow",
    unit: "%",
    step: "0.1",
  },
  {
    label: "Weight Variance",
    greenKey: "weightGreen",
    yellowKey: "weightYellow",
    unit: "%",
    step: "0.1",
  },
  {
    label: "Fuel Surcharge Variance",
    greenKey: "fuelSurchargeGreen",
    yellowKey: "fuelSurchargeYellow",
    unit: "%",
    step: "0.01",
  },
];

function TolerancesTab({ data }: { data: SettingsPageData }) {
  const router = useRouter();
  const { toast } = useToast();
  const [tolerances, setTolerances] = useState<Tolerances>(
    data.organization.settings.tolerances
  );
  const [saving, setSaving] = useState(false);

  const update = (key: keyof Tolerances, value: number) => {
    setTolerances((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    const result = await updateOrgSettings({ tolerances });
    if (result.success) {
      toast("Tolerances saved successfully.", "success");
      startTransition(() => router.refresh());
    } else {
      toast(result.error ?? "Failed to save tolerances.", "error");
    }
    setSaving(false);
  };

  const handleReset = () => {
    setTolerances(DEFAULT_TOLERANCES);
  };

  return (
    <Card className="space-y-6 bg-white/90">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Tolerance thresholds</h3>
        <Button variant="ghost" onClick={handleReset} className="text-xs">
          <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
          Reset to Defaults
        </Button>
      </div>

      <div className="space-y-8">
        {TOLERANCE_GROUPS.map((group) => (
          <div key={group.greenKey} className="space-y-3">
            <p className="text-sm font-semibold text-[color:var(--foreground)]">
              {group.label}
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs text-[color:var(--muted)]">
                  Green threshold ({group.unit})
                </label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step={group.step}
                  value={tolerances[group.greenKey]}
                  onChange={(e) =>
                    update(group.greenKey, parseFloat(e.target.value) || 0)
                  }
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs text-[color:var(--muted)]">
                  Yellow threshold ({group.unit})
                </label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step={group.step}
                  value={tolerances[group.yellowKey]}
                  onChange={(e) =>
                    update(group.yellowKey, parseFloat(e.target.value) || 0)
                  }
                />
              </div>
            </div>
            <ToleranceBar
              greenMax={tolerances[group.greenKey]}
              yellowMax={tolerances[group.yellowKey]}
              unit={group.unit}
            />
          </div>
        ))}

        {/* Date window */}
        <div className="space-y-3">
          <p className="text-sm font-semibold text-[color:var(--foreground)]">
            Date Window
          </p>
          <div className="max-w-xs">
            <label className="mb-1.5 block text-xs text-[color:var(--muted)]">
              Allowed date variance (days)
            </label>
            <Input
              type="number"
              min="0"
              max="90"
              step="1"
              value={tolerances.dateWindowDays}
              onChange={(e) =>
                update("dateWindowDays", parseInt(e.target.value, 10) || 0)
              }
            />
          </div>
          <p className="text-xs text-[color:var(--muted)]">
            Shipment dates within this window of the document date are
            considered a match.
          </p>
        </div>
      </div>

      <div className="flex justify-end">
        <Button disabled={saving} onClick={handleSave}>
          {saving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          {saving ? "Saving..." : "Save Tolerances"}
        </Button>
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Toggle switch                                                     */
/* ------------------------------------------------------------------ */

function Toggle({
  checked,
  onChange,
  id,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  id: string;
}) {
  return (
    <button
      id={id}
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors",
        checked ? "bg-emerald-500" : "bg-slate-300"
      )}
    >
      <span
        className={cn(
          "pointer-events-none inline-block h-5 w-5 translate-y-0.5 rounded-full bg-white shadow transition-transform",
          checked ? "translate-x-[22px]" : "translate-x-0.5"
        )}
      />
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Auto-Approve tab                                                  */
/* ------------------------------------------------------------------ */

function AutoApproveTab({ data }: { data: SettingsPageData }) {
  const router = useRouter();
  const { toast } = useToast();
  const [enabled, setEnabled] = useState(
    data.organization.settings.autoApproveEnabled
  );
  const [threshold, setThreshold] = useState(
    data.organization.settings.autoApproveConfidenceThreshold
  );
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const result = await updateOrgSettings({
      autoApproveEnabled: enabled,
      autoApproveConfidenceThreshold: threshold,
    });
    if (result.success) {
      toast("Auto-approve settings saved.", "success");
      startTransition(() => router.refresh());
    } else {
      toast(result.error ?? "Failed to save settings.", "error");
    }
    setSaving(false);
  };

  return (
    <Card className="space-y-6 bg-white/90">
      <h3 className="text-lg font-semibold">Auto-Approve</h3>

      <div className="flex items-center gap-4">
        <Toggle
          id="auto-approve-toggle"
          checked={enabled}
          onChange={setEnabled}
        />
        <label
          htmlFor="auto-approve-toggle"
          className="text-sm font-medium text-[color:var(--foreground)]"
        >
          {enabled ? "Enabled" : "Disabled"}
        </label>
      </div>

      <AnimatePresence>
        {enabled && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-4 overflow-hidden"
          >
            <div>
              <label className="mb-2 block text-xs uppercase tracking-[0.2em] text-[color:var(--muted)]">
                Confidence threshold: {threshold}%
              </label>
              <input
                type="range"
                min={80}
                max={99}
                step={1}
                value={threshold}
                onChange={(e) => setThreshold(parseInt(e.target.value, 10))}
                className="h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-indigo-600 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[color:var(--foreground)]"
              />
              <div className="mt-1 flex justify-between text-[10px] text-[color:var(--muted)]">
                <span>80%</span>
                <span>99%</span>
              </div>
            </div>

            <div className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3">
              <p className="text-sm font-medium text-indigo-900">
                <Zap className="mr-1.5 inline h-4 w-4" />
                Based on current settings, {data.autoApproveSimulation} of your
                last 30 shipments would have been auto-approved.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="rounded-xl border border-[color:var(--border)] bg-slate-50 px-4 py-3">
        <p className="text-sm text-[color:var(--muted)]">
          <Shield className="mr-1.5 inline h-4 w-4" />
          When enabled, shipments with all-green discrepancies and a match
          confidence above the threshold are automatically approved during
          reconciliation. No manual review is required for these shipments.
        </p>
      </div>

      <div className="flex justify-end">
        <Button disabled={saving} onClick={handleSave}>
          {saving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          {saving ? "Saving..." : "Save Settings"}
        </Button>
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Notifications tab                                                  */
/* ------------------------------------------------------------------ */

function NotificationsTab({ data }: { data: SettingsPageData }) {
  const router = useRouter();
  const { toast } = useToast();
  const [enabled, setEnabled] = useState(
    data.organization.settings.dailySummaryEnabled
  );
  const [recipients, setRecipients] = useState<string[]>(
    data.organization.settings.summaryRecipients
  );
  const [newEmail, setNewEmail] = useState("");
  const [saving, setSaving] = useState(false);

  const addRecipient = () => {
    const trimmed = newEmail.trim().toLowerCase();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return;
    if (recipients.includes(trimmed)) return;
    setRecipients((prev) => [...prev, trimmed]);
    setNewEmail("");
  };

  const removeRecipient = (email: string) => {
    setRecipients((prev) => prev.filter((r) => r !== email));
  };

  const handleSave = async () => {
    setSaving(true);
    const result = await updateOrgSettings({
      dailySummaryEnabled: enabled,
      summaryRecipients: recipients,
    });
    if (result.success) {
      toast("Notification settings saved.", "success");
      startTransition(() => router.refresh());
    } else {
      toast(result.error ?? "Failed to save settings.", "error");
    }
    setSaving(false);
  };

  return (
    <Card className="space-y-6 bg-white/90">
      <h3 className="text-lg font-semibold">Daily Summary Notifications</h3>

      <div className="flex items-center gap-4">
        <Toggle
          id="daily-summary-toggle"
          checked={enabled}
          onChange={setEnabled}
        />
        <label
          htmlFor="daily-summary-toggle"
          className="text-sm font-medium text-[color:var(--foreground)]"
        >
          {enabled ? "Enabled" : "Disabled"}
        </label>
      </div>

      <AnimatePresence>
        {enabled && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-4 overflow-hidden"
          >
            <div>
              <label className="mb-2 block text-xs uppercase tracking-[0.2em] text-[color:var(--muted)]">
                Recipients
              </label>

              {recipients.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-2">
                  {recipients.map((email) => (
                    <span
                      key={email}
                      className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700"
                    >
                      {email}
                      <button
                        type="button"
                        onClick={() => removeRecipient(email)}
                        className="rounded-full p-0.5 transition hover:bg-indigo-200"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="team@example.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addRecipient();
                    }
                  }}
                />
                <Button
                  variant="secondary"
                  onClick={addRecipient}
                  disabled={!newEmail.trim()}
                >
                  <Plus className="mr-1.5 h-4 w-4" />
                  Add
                </Button>
              </div>
            </div>

            <div className="rounded-xl border border-[color:var(--border)] bg-slate-50 px-4 py-3">
              <p className="text-sm text-[color:var(--muted)]">
                <Bell className="mr-1.5 inline h-4 w-4" />
                When enabled, a reconciliation summary email is generated daily
                at 8 AM UTC on weekdays. You can preview past summaries on the{" "}
                <a
                  href="/dashboard/notifications"
                  className="font-medium text-indigo-600 underline"
                >
                  Notifications
                </a>{" "}
                page.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex justify-end">
        <Button disabled={saving} onClick={handleSave}>
          {saving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          {saving ? "Saving..." : "Save Settings"}
        </Button>
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Invite modal                                                      */
/* ------------------------------------------------------------------ */

function InviteModal({
  onSubmit,
  onClose,
  loading,
}: {
  onSubmit: (email: string, name: string, role: string) => Promise<void>;
  onClose: () => void;
  loading: boolean;
}) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("analyst");
  const backdropRef = useRef<HTMLDivElement>(null);

  return (
    <motion.div
      ref={backdropRef}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === backdropRef.current) onClose();
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        transition={{ type: "spring", damping: 25, stiffness: 350 }}
        className="w-full max-w-md rounded-2xl border border-[color:var(--border)] bg-white p-6 shadow-xl"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-[color:var(--foreground)]">
            Invite team member
          </h3>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-[color:var(--muted)] hover:bg-black/5"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5 space-y-4">
          <div>
            <label className="mb-1.5 block text-xs text-[color:var(--muted)]">
              Email
            </label>
            <Input
              type="email"
              placeholder="user@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-[color:var(--muted)]">
              Full name
            </label>
            <Input
              placeholder="Jane Smith"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-[color:var(--muted)]">
              Role
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-sm text-[color:var(--foreground)] outline-none transition focus:border-[color:var(--accent)]"
            >
              <option value="admin">Admin</option>
              <option value="analyst">Analyst</option>
              <option value="reviewer">Reviewer</option>
            </select>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={() => onSubmit(email, name, role)}
            disabled={loading || !email.trim() || !name.trim()}
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Plus className="mr-2 h-4 w-4" />
            )}
            {loading ? "Creating..." : "Create User"}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Delete confirmation modal                                         */
/* ------------------------------------------------------------------ */

function DeleteConfirmModal({
  member,
  onConfirm,
  onCancel,
  loading,
}: {
  member: TeamMember;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        transition={{ type: "spring", damping: 25, stiffness: 350 }}
        className="w-full max-w-md rounded-2xl border border-[color:var(--border)] bg-white p-6 shadow-xl"
      >
        <h3 className="text-lg font-semibold text-[color:var(--foreground)]">
          <AlertTriangle className="mr-2 inline h-5 w-5 text-amber-500" />
          Remove team member?
        </h3>
        <p className="mt-2 text-sm text-[color:var(--muted)]">
          Remove <span className="font-medium">{member.name}</span> (
          {member.email}) from your organization? This cannot be undone.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="ghost" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button variant="danger" onClick={onConfirm} disabled={loading}>
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="mr-2 h-4 w-4" />
            )}
            {loading ? "Removing..." : "Remove"}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Team tab                                                          */
/* ------------------------------------------------------------------ */

const roleTone: Record<string, "green" | "yellow" | "red" | "neutral"> = {
  admin: "red",
  manager: "red",
  analyst: "yellow",
  reviewer: "green",
};

function TeamTab({ data }: { data: SettingsPageData }) {
  const router = useRouter();
  const { toast } = useToast();
  const [showInvite, setShowInvite] = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TeamMember | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleInvite = useCallback(
    async (email: string, name: string, role: string) => {
      setInviteLoading(true);
      const result = await createTeamMember(email, name, role);
      if (result.success) {
        toast("Team member created successfully.", "success");
        setShowInvite(false);
        startTransition(() => router.refresh());
      } else {
        toast(result.error ?? "Failed to create user.", "error");
      }
      setInviteLoading(false);
    },
    [toast, router]
  );

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    const result = await removeTeamMember(deleteTarget.id);
    if (result.success) {
      toast("Team member removed.", "success");
      setDeleteTarget(null);
      startTransition(() => router.refresh());
    } else {
      toast(result.error ?? "Failed to remove user.", "error");
    }
    setDeleteLoading(false);
  }, [deleteTarget, toast, router]);

  return (
    <>
      <Card className="space-y-5 bg-white/90">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Team members</h3>
          <Button onClick={() => setShowInvite(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Invite User
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-left text-sm">
            <thead className="bg-black/5 text-[color:var(--muted)]">
              <tr>
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-5 py-3 font-medium">Email</th>
                <th className="px-5 py-3 font-medium">Role</th>
                <th className="px-5 py-3 font-medium">Joined</th>
                <th className="px-5 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {data.teamMembers.map((member) => {
                const isSelf = member.id === data.session.userId;
                return (
                  <tr
                    key={member.id}
                    className="border-t border-[color:var(--border)]"
                  >
                    <td className="px-5 py-3 font-medium">
                      {member.name}
                      {isSelf && (
                        <span className="ml-2 text-xs text-[color:var(--muted)]">
                          (you)
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-[color:var(--muted)]">
                      {member.email}
                    </td>
                    <td className="px-5 py-3">
                      <Badge tone={roleTone[member.role] ?? "neutral"}>
                        {member.role}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-[color:var(--muted)]">
                      {formatDate(member.created_at)}
                    </td>
                    <td className="px-5 py-3 text-right">
                      {!isSelf && (
                        <button
                          onClick={() => setDeleteTarget(member)}
                          className="rounded-full p-1.5 text-[color:var(--muted)] transition hover:bg-rose-50 hover:text-rose-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <AnimatePresence>
        {showInvite && (
          <InviteModal
            loading={inviteLoading}
            onSubmit={handleInvite}
            onClose={() => setShowInvite(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleteTarget && (
          <DeleteConfirmModal
            member={deleteTarget}
            loading={deleteLoading}
            onConfirm={handleDelete}
            onCancel={() => setDeleteTarget(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
