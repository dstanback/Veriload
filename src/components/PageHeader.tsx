import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

interface Breadcrumb {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumbs?: Breadcrumb[];
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, description, breadcrumbs, actions, className }: PageHeaderProps) {
  return (
    <div className={cn("space-y-2", className)}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="flex items-center gap-1 text-sm text-[color:var(--muted)]">
          {breadcrumbs.map((crumb, index) => (
            <span key={crumb.label} className="flex items-center gap-1">
              {index > 0 && <ChevronRight size={14} className="text-[color:var(--muted)]/50" />}
              {crumb.href ? (
                <Link href={crumb.href} className="transition-colors hover:text-[color:var(--foreground)]">
                  {crumb.label}
                </Link>
              ) : (
                <span className="text-[color:var(--foreground)]">{crumb.label}</span>
              )}
            </span>
          ))}
        </nav>
      )}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          {description && <p className="mt-1 text-sm text-[color:var(--muted)]">{description}</p>}
        </div>
        {actions && <div className="flex flex-shrink-0 items-center gap-3">{actions}</div>}
      </div>
    </div>
  );
}
