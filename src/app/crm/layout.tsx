import { CrmSidebar } from "@/components/crm/sidebar";

export default function CrmLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-[#0f0f0f]">
      <CrmSidebar />
      <main className="flex h-screen min-w-0 flex-1 flex-col overflow-y-auto overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}
