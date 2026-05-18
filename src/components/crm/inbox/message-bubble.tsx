"use client";

import { cn } from "@/lib/utils";
import type { Message } from "@/types/crm";

export function MessageBubble({ message }: { message: Message }) {
  const isInbound = message.direction === "inbound";
  const isManual = message.sent_by === "manual";

  return (
    <div className={cn("flex", isInbound ? "justify-start" : "justify-end")}>
      <div
        className={cn(
          "max-w-[70%] rounded-2xl px-4 py-2",
          isInbound
            ? "rounded-tl-sm bg-[#252525] text-white"
            : isManual
              ? "rounded-tr-sm bg-[#E8521A] text-white"
              : "rounded-tr-sm bg-[#E8521A]/70 text-white"
        )}
      >
        {isManual && !isInbound && (
          <span className="mb-1 block text-[10px] font-medium opacity-80">Manual</span>
        )}
        {message.type === "audio" ? (
          <AudioPlayer />
        ) : message.type === "video" ? (
          <VideoPreview url={message.media_url} />
        ) : (
          <p className="whitespace-pre-wrap text-sm">{message.content}</p>
        )}
        <div className="mt-1 flex items-center justify-end gap-1 text-[10px] opacity-60">
          <span>{new Date(message.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
          {!isInbound && <StatusIcon status={message.status} />}
        </div>
      </div>
    </div>
  );
}

function AudioPlayer() {
  return (
    <div className="flex items-center gap-2 py-1">
      <div className="flex h-8 items-end gap-0.5">
        {[3, 5, 8, 4, 6, 9, 5, 3].map((h, i) => (
          <span
            key={i}
            className="w-1 rounded-full bg-white/60"
            style={{ height: `${h * 3}px` }}
          />
        ))}
      </div>
      <span className="text-xs">Áudio</span>
    </div>
  );
}

function VideoPreview({ url }: { url: string | null }) {
  return (
    <div className="relative aspect-video w-48 overflow-hidden rounded-lg bg-black">
      {url ? (
        <video src={url} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full items-center justify-center text-xs text-gray-400">
          Vídeo
        </div>
      )}
      <div className="absolute inset-0 flex items-center justify-center bg-black/30">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-black">
          ▶
        </div>
      </div>
    </div>
  );
}

function StatusIcon({ status }: { status: string }) {
  if (status === "read") return <span className="text-blue-300">✓✓</span>;
  if (status === "delivered") return <span>✓✓</span>;
  return <span>✓</span>;
}
