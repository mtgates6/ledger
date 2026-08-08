import { BottomNav } from "@/components/bottom-nav";

// Every page under here reads live data straight from Postgres on each
// request; nothing in this app should ever be statically prerendered.
export const dynamic = "force-dynamic";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex-1 pb-20">{children}</div>
      <BottomNav />
    </div>
  );
}
