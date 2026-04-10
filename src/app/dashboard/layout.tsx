import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { ToastProvider } from "@/components/ui/toast";

export default function DashboardLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ToastProvider>
      <main className="min-h-screen px-4 py-4 md:px-6 md:py-6">
        <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[280px_1fr]">
          <Sidebar />
          <div className="space-y-6">
            <Header />
            {children}
          </div>
        </div>
      </main>
    </ToastProvider>
  );
}
