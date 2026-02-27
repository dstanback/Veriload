"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-[color:var(--foreground)] text-white hover:opacity-95",
  secondary: "border border-[color:var(--border)] bg-white text-[color:var(--foreground)] hover:bg-black/5",
  ghost: "text-[color:var(--foreground)] hover:bg-black/5",
  danger: "bg-[color:var(--danger)] text-white hover:opacity-95"
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

export function Button({ className, variant = "primary", ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60",
        variantClasses[variant],
        className
      )}
      {...props}
    />
  );
}
