import { CrmSidebar } from "@/components/crm/sidebar";

export default function CrmLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-[#0f0f0f]">
      <CrmSidebar />
      <main className="flex min-h-screen min-w-0 flex-1 flex-col overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}
