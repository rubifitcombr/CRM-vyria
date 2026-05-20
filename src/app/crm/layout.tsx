import { CrmSidebar } from "@/components/crm/sidebar";

export default function CrmLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="crm-app-shell flex h-[100dvh] max-h-[100dvh] overflow-hidden bg-[#0f0f0f]">
      <CrmSidebar />
      <main className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-y-contain">
        {children}
      </main>
    </div>
  );
}
