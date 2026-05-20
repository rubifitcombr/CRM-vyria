"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Inbox,
  Users,
  Kanban,
  GitBranch,
  Tags,
  Settings,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

const nav = [
  { href: "/crm/inbox", label: "Inbox", icon: Inbox },
  { href: "/crm/contacts", label: "Contatos", icon: Users },
  { href: "/crm/pipeline", label: "Pipeline", icon: Kanban },
  { href: "/crm/funnels", label: "Funis", icon: GitBranch },
  { href: "/crm/tags", label: "Tags", icon: Tags },
  { href: "/crm/settings", label: "Configurações", icon: Settings },
];

export function CrmSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="flex h-full w-56 shrink-0 flex-col overflow-y-auto border-r border-[#2e2e2e] bg-[#1a1a1a]">
      <div className="border-b border-[#2e2e2e] px-4 py-5">
        <Link href="/crm/inbox" className="text-lg font-bold text-white">
          Vyria <span className="text-[#E8521A]">CRM</span>
        </Link>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {nav.map(({ href, label, icon: Icon }) => {
          const active =
            pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition",
                active
                  ? "bg-[#E8521A]/15 text-[#E8521A]"
                  : "text-gray-400 hover:bg-[#252525] hover:text-white"
              )}
            >
              <Icon size={18} />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-[#2e2e2e] p-3">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-gray-400 transition hover:bg-[#252525] hover:text-white"
        >
          <LogOut size={18} />
          Sair
        </button>
      </div>
    </aside>
  );
}
