"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import { AlertCircle, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface LoginFormProps {
  action: (prev: { error: string | null }, formData: FormData) => Promise<{ error: string | null }>;
}

export function LoginForm({ action }: LoginFormProps) {
  const [state, formAction] = useFormState(action, { error: null });
  const [isPending, setIsPending] = useState(false);

  return (
    <form action={(fd) => { setIsPending(true); formAction(fd); }} className="mt-6 space-y-4">
      {state.error && (
        <div className="flex items-center gap-2 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <AlertCircle size={16} className="flex-shrink-0" />
          {state.error}
        </div>
      )}

      <div>
        <label htmlFor="email" className="mb-1.5 block text-xs font-medium text-[color:var(--muted)]">
          Email address
        </label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="you@company.com"
          required
          autoComplete="email"
          autoFocus
        />
      </div>

      <div>
        <label htmlFor="password" className="mb-1.5 block text-xs font-medium text-[color:var(--muted)]">
          Password
        </label>
        <Input
          id="password"
          name="password"
          type="password"
          placeholder="Enter your password"
          required
          autoComplete="current-password"
        />
      </div>

      <Button type="submit" disabled={isPending} className="w-full gap-2">
        {isPending ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Signing in...
          </>
        ) : (
          "Sign in"
        )}
      </Button>
    </form>
  );
}
