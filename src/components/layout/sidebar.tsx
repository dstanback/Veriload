 "use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileSearch, LayoutDashboard, Settings, UploadCloud } from "lucide-react";

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
    href: "/dashboard/settings",
    label: "Settings",
    icon: Settings
  }
];

export function Sidebar() {
  const pathname = usePathname();

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
      <div className="mt-10 rounded-2xl border border-white/10 bg-white/5 p-4">
        <p className="text-sm font-medium">Dedicated inbox</p>
        <p className="mt-2 text-sm text-white/65">docs@acme.veriload.local</p>
      </div>
    </aside>
  );
}
