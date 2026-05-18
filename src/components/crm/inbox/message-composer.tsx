"use client";

import { useRef, useState } from "react";
import { VARIABLE_BUTTONS } from "@/lib/crm/variables";
import { Mic, Send, Square, Video } from "lucide-react";

type Tab = "text" | "audio" | "video";

export function MessageComposer({
  contactId,
  phone,
  onSent,
}: {
  contactId: string;
  phone: string;
  onSent: () => void;
}) {
  const [tab, setTab] = useState<Tab>("text");
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  async function uploadFile(file: Blob | File, ext: string) {
    const formData = new FormData();
    formData.append("file", file, `media.${ext}`);
    formData.append("phone", phone);
    const res = await fetch("/api/crm/upload", { method: "POST", body: formData });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    return data.url as string;
  }

  async function send(type: string, content: string, mediaUrl?: string) {
    setSending(true);
    try {
      const res = await fetch("/api/crm/messages/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contact_id: contactId,
          type,
          content,
          media_url: mediaUrl,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      setText("");
      setAudioBlob(null);
      setVideoFile(null);
      onSent();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erro ao enviar");
    } finally {
      setSending(false);
    }
  }

  async function handleSendText() {
    if (!text.trim()) return;
    await send("text", text);
  }

  async function startRecording() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);
    chunksRef.current = [];
    recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
    recorder.onstop = () => {
      setAudioBlob(new Blob(chunksRef.current, { type: "audio/webm" }));
      stream.getTracks().forEach((t) => t.stop());
    };
    recorder.start();
    mediaRecorderRef.current = recorder;
    setRecording(true);
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  }

  async function handleSendAudio() {
    if (!audioBlob) return;
    const url = await uploadFile(audioBlob, "webm");
    await send("audio", "Áudio", url);
  }

  async function handleSendVideo() {
    if (!videoFile) return;
    const url = await uploadFile(videoFile, videoFile.name.split(".").pop() ?? "mp4");
    await send("video", "Vídeo", url);
  }

  function insertVariable(v: string) {
    const el = textareaRef.current;
    if (!el) {
      setText((t) => t + v);
      return;
    }
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const newText = text.slice(0, start) + v + text.slice(end);
    setText(newText);
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "text", label: "Texto" },
    { id: "audio", label: "Áudio" },
    { id: "video", label: "Vídeo" },
  ];

  return (
    <div className="border-t border-[#2e2e2e] bg-[#1a1a1a] p-4">
      <div className="mb-3 flex gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-lg px-3 py-1.5 text-sm ${
              tab === t.id
                ? "bg-[#E8521A] text-white"
                : "bg-[#252525] text-gray-400"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "text" && (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-1">
            {VARIABLE_BUTTONS.map((v) => (
              <button
                key={v.key}
                onClick={() => insertVariable(v.key)}
                className="rounded bg-[#252525] px-2 py-0.5 text-xs text-gray-400 hover:text-white"
              >
                {v.label}
              </button>
            ))}
          </div>
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Digite sua mensagem..."
            rows={3}
            className="w-full resize-none rounded-lg border border-[#2e2e2e] bg-[#252525] px-3 py-2 text-sm text-white outline-none focus:border-[#E8521A]"
          />
          <button
            onClick={handleSendText}
            disabled={sending || !text.trim()}
            className="flex items-center gap-2 rounded-lg bg-[#E8521A] px-4 py-2 text-sm text-white disabled:opacity-50"
          >
            <Send size={16} /> Enviar
          </button>
        </div>
      )}

      {tab === "audio" && (
        <div className="space-y-3">
          {!recording && !audioBlob && (
            <button
              onClick={startRecording}
              className="flex items-center gap-2 rounded-lg bg-[#252525] px-4 py-3 text-sm text-white"
            >
              <Mic size={18} className="text-[#E8521A]" /> Gravar áudio
            </button>
          )}
          {recording && (
            <div className="flex items-center gap-3">
              <div className="flex h-8 items-end gap-0.5">
                {[4, 6, 8, 5, 7, 9, 6, 4].map((h, i) => (
                  <span
                    key={i}
                    className="w-1 animate-pulse rounded-full bg-[#E8521A]"
                    style={{ height: `${h * 3}px` }}
                  />
                ))}
              </div>
              <button
                onClick={stopRecording}
                className="flex items-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-sm text-white"
              >
                <Square size={14} /> Parar
              </button>
            </div>
          )}
          {audioBlob && !recording && (
            <button
              onClick={handleSendAudio}
              disabled={sending}
              className="flex items-center gap-2 rounded-lg bg-[#E8521A] px-4 py-2 text-sm text-white"
            >
              <Send size={16} /> Enviar áudio
            </button>
          )}
        </div>
      )}

      {tab === "video" && (
        <div className="space-y-3">
          <input
            type="file"
            accept="video/*"
            onChange={(e) => setVideoFile(e.target.files?.[0] ?? null)}
            className="text-sm text-gray-400"
          />
          {videoFile && (
            <video
              src={URL.createObjectURL(videoFile)}
              controls
              className="max-h-40 rounded-lg"
            />
          )}
          {videoFile && (
            <button
              onClick={handleSendVideo}
              disabled={sending}
              className="flex items-center gap-2 rounded-lg bg-[#E8521A] px-4 py-2 text-sm text-white"
            >
              <Video size={16} /> Enviar vídeo
            </button>
          )}
        </div>
      )}
    </div>
  );
}
