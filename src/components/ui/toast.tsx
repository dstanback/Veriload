"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle, Info, XCircle } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { cn } from "@/lib/utils";

type ToastVariant = "success" | "error" | "info";

interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  toast: (message: string, variant?: ToastVariant) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const AUTO_DISMISS_MS = 4000;

const variantStyles: Record<ToastVariant, string> = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
  error: "border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-200",
  info: "border-indigo-200 bg-indigo-50 text-indigo-900 dark:border-indigo-800 dark:bg-indigo-950 dark:text-indigo-200",
};

const progressColors: Record<ToastVariant, string> = {
  success: "bg-emerald-500",
  error: "bg-rose-500",
  info: "bg-indigo-500",
};

const icons: Record<ToastVariant, ReactNode> = {
  success: <CheckCircle className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />,
  error: <XCircle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />,
  info: <Info className="h-4 w-4 shrink-0 text-indigo-600 dark:text-indigo-400" />,
};

function ToastItem({
  toast: t,
  onDismiss,
}: {
  toast: Toast;
  onDismiss: (id: string) => void;
}) {
  return (
    <motion.div
      layout
      role="alert"
      aria-live="polite"
      initial={{ opacity: 0, x: 80, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 80, scale: 0.95 }}
      transition={{ type: "spring", damping: 25, stiffness: 300 }}
      className={cn(
        "pointer-events-auto w-80 overflow-hidden rounded-xl border shadow-lg",
        variantStyles[t.variant]
      )}
    >
      <div className="flex items-start gap-3 px-4 py-3">
        {icons[t.variant]}
        <p className="text-sm font-medium leading-snug">{t.message}</p>
        <button
          onClick={() => onDismiss(t.id)}
          aria-label="Dismiss notification"
          className="ml-auto shrink-0 rounded p-0.5 opacity-60 transition hover:opacity-100"
        >
          <XCircle className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="h-1 w-full bg-black/5 dark:bg-white/10">
        <motion.div
          className={cn("h-full", progressColors[t.variant])}
          initial={{ width: "100%" }}
          animate={{ width: "0%" }}
          transition={{ duration: AUTO_DISMISS_MS / 1000, ease: "linear" }}
        />
      </div>
    </motion.div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counterRef = useRef(0);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (message: string, variant: ToastVariant = "info") => {
      const id = `toast-${++counterRef.current}`;
      setToasts((prev) => [...prev, { id, message, variant }]);
      setTimeout(() => dismiss(id), AUTO_DISMISS_MS);
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div
        className="pointer-events-none fixed right-4 top-4 z-50 flex flex-col gap-2"
        aria-label="Notifications"
      >
        <AnimatePresence mode="popLayout">
          {toasts.map((t) => (
            <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return ctx;
}
