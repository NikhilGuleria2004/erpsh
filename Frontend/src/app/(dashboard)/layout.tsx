import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import AuthGate from "@/components/layout/AuthGate";

export default function DashboardGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGate>
      <div className="flex h-screen overflow-hidden bg-bg">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <Header />
          <main className="scroll-thin flex-1 overflow-y-auto px-4 py-6 md:px-6">
            <div className="mx-auto flex max-w-[1400px] flex-col gap-6">
              {children}
            </div>
          </main>
        </div>
      </div>
    </AuthGate>
  );
}