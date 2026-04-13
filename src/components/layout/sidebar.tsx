"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  Check,
  ChevronDown,
  ChevronUp,
  FileSearch,
  LayoutDashboard,
  Rocket,
  Settings,
  UploadCloud,
  X,
} from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";

const links = [
  {
    href: "/dashboard",
    label: "Overview",
    icon: LayoutDashboard
  },
  {
    href: "/dashboard/shipments",
    label: "Shipments",
    icon: FileSearch
  },
  {
    href: "/dashboard/upload",
    label: "Upload",
    icon: UploadCloud
  },
  {
    href: "/dashboard/notifications",
    label: "Notifications",
    icon: Bell
  },
  {
    href: "/dashboard/settings",
    label: "Settings",
    icon: Settings
  }
];

export interface ChecklistState {
  uploadedDocument: boolean;
  reviewedShipment: boolean;
  configuredTolerances: boolean;
  dismissed: boolean;
}

const checklistItems = [
  { key: "uploadedDocument" as const, label: "Upload first document" },
  { key: "reviewedShipment" as const, label: "Review a shipment" },
  { key: "configuredTolerances" as const, label: "Configure tolerances" },
];

export function Sidebar({ checklist }: { checklist?: ChecklistState }) {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const completedCount = checklist
    ? checklistItems.filter((item) => checklist[item.key]).length
    : 0;
  const allDone = completedCount === checklistItems.length;
  const showChecklist =
    checklist && !checklist.dismissed && !allDone && !dismissed;

  return (
    <aside className="rounded-[2rem] bg-[#17202a] p-5 text-white shadow-card">
      <div className="mb-8">
        <p className="text-xs uppercase tracking-[0.22em] text-white/60">Veriload</p>
        <p className="mt-2 text-2xl font-semibold">Ops Console</p>
      </div>
      <nav className="space-y-2">
        {links.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition",
                active ? "bg-white text-[#17202a]" : "text-white/75 hover:bg-white/10 hover:text-white"
              )}
            >
              <Icon size={18} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Getting Started checklist */}
      <AnimatePresence>
        {showChecklist && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setExpanded(!expanded)}
                  className="flex items-center gap-2 text-sm font-medium text-white"
                >
                  <Rocket size={16} className="text-[color:var(--accent)]" />
                  Getting Started
                  <span className="rounded-full bg-[color:var(--accent)] px-2 py-0.5 text-[10px] font-bold">
                    {completedCount}/{checklistItems.length}
                  </span>
                  {expanded ? (
                    <ChevronUp size={14} className="text-white/50" />
                  ) : (
                    <ChevronDown size={14} className="text-white/50" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setDismissed(true)}
                  className="rounded-full p-1 text-white/40 transition hover:bg-white/10 hover:text-white"
                  title="Dismiss"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Progress bar */}
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
                <motion.div
                  className="h-full rounded-full bg-[color:var(--accent)]"
                  initial={{ width: 0 }}
                  animate={{
                    width: `${(completedCount / checklistItems.length) * 100}%`,
                  }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                />
              </div>

              <AnimatePresence>
                {expanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-3 space-y-2">
                      {checklistItems.map((item) => {
                        const done = checklist[item.key];
                        return (
                          <div
                            key={item.key}
                            className="flex items-center gap-2.5 text-xs"
                          >
                            {done ? (
                              <Check
                                size={14}
                                className="shrink-0 text-emerald-400"
                              />
                            ) : (
                              <div className="h-3.5 w-3.5 shrink-0 rounded-full border border-white/30" />
                            )}
                            <span
                              className={
                                done
                                  ? "text-white/50 line-through"
                                  : "text-white/80"
                              }
                            >
                              {item.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
        <p className="text-sm font-medium">Dedicated inbox</p>
        <p className="mt-2 text-sm text-white/65">docs@acme.veriload.local</p>
      </div>
    </aside>
  );
}
