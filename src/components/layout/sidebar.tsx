"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { FileSearch, LayoutDashboard, Settings, Ship, UploadCloud } from "lucide-react";

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
    icon: Ship
  },
  {
    href: "/dashboard/upload",
    label: "Upload",
    icon: UploadCloud
  },
  {
    href: "/dashboard/settings",
    label: "Settings",
    icon: Settings
  }
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <motion.aside
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="rounded-[2rem] bg-[#17202a] p-5 text-white shadow-card"
    >
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[color:var(--accent)]">
            <FileSearch size={18} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-bold tracking-wide">Veriload</p>
            <p className="text-xs text-white/50">Ops Console</p>
          </div>
        </div>
      </div>

      <nav className="space-y-1">
        {links.map((item) => {
          const Icon = item.icon;
          const active = item.href === "/dashboard"
            ? pathname === "/dashboard"
            : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-all duration-200",
                active
                  ? "bg-white text-[#17202a]"
                  : "text-white/70 hover:bg-white/8 hover:text-white"
              )}
            >
              {active && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute inset-0 rounded-2xl bg-white"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-3">
                <Icon size={18} />
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-10 rounded-2xl border border-white/10 bg-white/5 p-4">
        <p className="text-sm font-medium">Dedicated inbox</p>
        <p className="mt-2 text-xs text-white/55">docs@acme.veriload.local</p>
      </div>
    </motion.aside>
  );
}
