import { CrmSidebar } from "@/components/crm/sidebar";

export default function CrmLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0f0f0f]">
      <CrmSidebar />
      <main className="ml-56 min-h-screen overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}
