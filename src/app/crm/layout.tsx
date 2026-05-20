import { CrmSidebar } from "@/components/crm/sidebar";

export default function CrmLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="crm-shell bg-[#0f0f0f]">
      <CrmSidebar />
      <main className="crm-main-pane">{children}</main>
    </div>
  );
}
