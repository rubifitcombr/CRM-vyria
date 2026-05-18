"use client";

import { use } from "react";
import { FunnelEditor } from "@/components/crm/funnel/funnel-editor";

export default function FunnelEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return (
    <div className="h-full min-h-0 flex-1">
      <FunnelEditor funnelId={id} />
    </div>
  );
}
