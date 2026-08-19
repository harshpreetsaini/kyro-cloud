"use client";

import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { RuntimeProvider } from "@/components/providers/RuntimeProvider";
import { Notifications } from "@/components/Notifications";
import { ErrorBoundary } from "@/components/ErrorBoundary";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <RuntimeProvider>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <TopBar />
          <main className="flex-1 overflow-auto p-5">
            <ErrorBoundary>{children}</ErrorBoundary>
          </main>
        </div>
      </div>
      <Notifications />
    </RuntimeProvider>
  );
}
