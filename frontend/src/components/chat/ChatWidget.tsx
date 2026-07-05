"use client";

import { getAccessToken } from "@/lib/auth";
import { useAuthStore } from "@/store/authStore";
import Image from "next/image";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api/v1";

type ChatMessage = {
  id: string;
  body: string | null;
  imageUrl: string | null;
  senderId: string;
  senderName: string;
  mine: boolean;
  createdAt: string;
};

export type ChatConversation = {
  id: string;
  propertyId: string;
  propertyTitle: string;
  propertyImage: string | null;
  guestName: string;
  hostName: string;
  peerName: string;
  peerAvatar: string | null;
  isHost: boolean;
  unreadCount: number;
  lastMessageAt: string;
  lastMessagePreview: string | null;
  messages: ChatMessage[];
};

type ChatOpenEvent = CustomEvent<{ conversationId?: string; propertyId?: string; quickMessage?: string }>;

function authHeaders(): Record<string, string> {
  const token = getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function parseJson<T>(response: Response) {
  if (!response.ok) throw new Error("Request failed");
  return (await response.json()) as T;
}

export function openChatWidget(detail?: { conversationId?: string; propertyId?: string; quickMessage?: string }) {
  window.dispatchEvent(new CustomEvent("tripnest:open-chat", { detail }));
}

export function ChatWidget() {
  const user = useAuthStore((state) => state.user);
  const [open, setOpen] = useState(false);
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const activeConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === activeId) ?? null,
    [activeId, conversations]
  );
  const unreadCount = conversations.reduce((total, conversation) => total + conversation.unreadCount, 0);

  async function loadConversations(nextActiveId?: string | null) {
    if (!getAccessToken()) return;
    setLoading(true);
    try {
      const payload = await parseJson<{ data: { items: ChatConversation[]; unreadCount: number } }>(
        await fetch(`${API_URL}/conversations`, { headers: authHeaders() })
      );
      setConversations(payload.data.items ?? []);
      if (nextActiveId !== undefined) {
        setActiveId(nextActiveId);
      } else if (!activeId && payload.data.items?.[0]) {
        setActiveId(payload.data.items[0].id);
      }
    } finally {
      setLoading(false);
    }
  }

  async function loadConversation(conversationId: string) {
    const payload = await parseJson<{ data: ChatConversation }>(
      await fetch(`${API_URL}/conversations/${conversationId}`, { headers: authHeaders() })
    );
    setConversations((current) => {
      const exists = current.some((item) => item.id === payload.data.id);
      return exists
        ? current.map((item) => (item.id === payload.data.id ? payload.data : item))
        : [payload.data, ...current];
    });
    setActiveId(payload.data.id);
    await fetch(`${API_URL}/conversations/${payload.data.id}/read`, { method: "PATCH", headers: authHeaders() }).catch(() => undefined);
    setConversations((current) => current.map((item) => (item.id === payload.data.id ? { ...item, unreadCount: 0 } : item)));
  }

  function appendSentMessage(conversationId: string, sentMessage: ChatMessage, baseConversation?: ChatConversation) {
    setConversations((current) => {
      const exists = current.some((item) => item.id === conversationId);
      const updated = current.map((item) =>
        item.id === conversationId
          ? {
              ...item,
              messages: [...item.messages, sentMessage],
              lastMessageAt: sentMessage.createdAt,
              lastMessagePreview: sentMessage.body ?? "Đã gửi một ảnh",
            }
          : item
      );
      if (!exists && baseConversation) {
        updated.unshift({
          ...baseConversation,
          messages: [...baseConversation.messages, sentMessage],
          lastMessageAt: sentMessage.createdAt,
          lastMessagePreview: sentMessage.body ?? "Đã gửi một ảnh",
        });
      }
      return updated.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
    });
  }

  async function postMessage(conversationId: string, payloadBody: { body?: string; imageUrl?: string }, baseConversation?: ChatConversation) {
    const payload = await parseJson<{ data: ChatMessage }>(
      await fetch(`${API_URL}/conversations/${conversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify(payloadBody),
      })
    );
    appendSentMessage(conversationId, payload.data, baseConversation);
    return payload.data;
  }

  async function startConversation(propertyId: string, quickMessage?: string) {
    const payload = await parseJson<{ data: ChatConversation }>(
      await fetch(`${API_URL}/conversations`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ propertyId }),
      })
    );
    setConversations((current) => {
      const exists = current.some((item) => item.id === payload.data.id);
      return exists
        ? current.map((item) => (item.id === payload.data.id ? payload.data : item))
        : [payload.data, ...current];
    });
    setActiveId(payload.data.id);
    if (quickMessage?.trim()) {
      setSending(true);
      try {
        await postMessage(payload.data.id, { body: quickMessage.trim() }, payload.data);
      } finally {
        setSending(false);
      }
    }
  }

  useEffect(() => {
    if (!user) return;
    loadConversations(null).catch(() => undefined);
    const timer = window.setInterval(() => loadConversations().catch(() => undefined), 30000);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    function onOpen(event: Event) {
      const detail = (event as ChatOpenEvent).detail;
      setOpen(true);
      if (detail?.conversationId) {
        loadConversation(detail.conversationId).catch(() => undefined);
      } else if (detail?.propertyId) {
        startConversation(detail.propertyId, detail.quickMessage).catch(() => undefined);
      } else {
        loadConversations().catch(() => undefined);
      }
    }

    window.addEventListener("tripnest:open-chat", onOpen);
    return () => window.removeEventListener("tripnest:open-chat", onOpen);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ block: "end" });
  }, [activeConversation?.messages.length, activeId, open]);

  async function selectConversation(conversationId: string) {
    await loadConversation(conversationId);
    setMenuOpen(false);
  }

  async function sendPayload(payloadBody: { body?: string; imageUrl?: string }) {
    if (!activeConversation) return;
    setSending(true);
    try {
      await postMessage(activeConversation.id, payloadBody);
      setMessage("");
    } finally {
      setSending(false);
    }
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!message.trim()) return;
    await sendPayload({ body: message });
  }

  function sendImage(file: File | undefined) {
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        sendPayload({ imageUrl: reader.result }).catch(() => undefined);
      }
    };
    reader.readAsDataURL(file);
  }

  async function hideConversation() {
    if (!activeConversation) return;
    await fetch(`${API_URL}/conversations/${activeConversation.id}`, { method: "DELETE", headers: authHeaders() }).catch(() => undefined);
    setConversations((current) => current.filter((item) => item.id !== activeConversation.id));
    setActiveId((current) => {
      const next = conversations.find((item) => item.id !== current);
      return next?.id ?? null;
    });
    setMenuOpen(false);
  }

  if (!user) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 grid h-14 w-14 place-items-center rounded-full bg-teal-800 text-white shadow-2xl shadow-teal-950/25 transition hover:bg-teal-900"
        aria-label="Mở cuộc trò chuyện"
      >
        <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 11.5a8.5 8.5 0 0 1-9.2 8.47 8.7 8.7 0 0 1-3.36-.92L3 20l1.18-4.16A8.4 8.4 0 0 1 3.5 11.5a8.5 8.5 0 1 1 17 0Z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 grid min-h-6 min-w-6 place-items-center rounded-full bg-rose-600 px-1 text-xs font-bold text-white ring-2 ring-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <section className="fixed bottom-24 right-5 z-50 flex h-[min(620px,calc(100vh-120px))] w-[390px] max-w-[calc(100vw-24px)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-950 shadow-2xl">
          <div className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 px-4">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{activeConversation?.propertyTitle ?? "Tin nhắn TripNest"}</p>
              {activeConversation?.isHost ? <p className="truncate text-xs text-slate-500">{activeConversation.guestName}</p> : null}
            </div>
            <button type="button" onClick={() => setOpen(false)} className="grid h-9 w-9 place-items-center rounded-full text-2xl text-slate-500 hover:bg-slate-100" aria-label="Đóng">
              ×
            </button>
          </div>

          {conversations.length === 0 && !loading ? (
            <div className="grid flex-1 place-items-center px-8 text-center text-sm leading-6 text-slate-500">
              Chưa có bất kỳ cuộc trò chuyện nào hãy bắt đầu trao đổi với chúng tôi
            </div>
          ) : (
            <div className="grid min-h-0 flex-1 grid-cols-[84px_minmax(0,1fr)]">
              <aside className="min-h-0 overflow-y-auto border-r border-slate-200 bg-slate-50">
                {conversations.map((conversation) => (
                  <button
                    key={conversation.id}
                    type="button"
                    onClick={() => selectConversation(conversation.id)}
                    className={`relative flex w-full flex-col items-center gap-2 border-b border-slate-200 px-2 py-3 text-center text-xs transition ${
                      conversation.id === activeId ? "bg-white" : "hover:bg-white"
                    }`}
                  >
                    <Avatar
                      src={conversation.isHost ? conversation.peerAvatar : conversation.propertyImage}
                      label={conversation.isHost ? conversation.peerName : conversation.propertyTitle}
                      size="md"
                    />
                    {conversation.unreadCount > 0 ? (
                      <span className="absolute right-2 top-2 grid min-h-5 min-w-5 place-items-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white">
                        {conversation.unreadCount}
                      </span>
                    ) : null}
                  </button>
                ))}
              </aside>

              <div className="flex min-h-0 min-w-0 flex-col">
                {activeConversation ? (
                  <>
                    <div className="relative flex shrink-0 items-center gap-3 border-b border-slate-100 px-3 py-3">
                      <button type="button" onClick={() => setMenuOpen((value) => !value)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                        <Avatar
                          src={activeConversation.isHost ? activeConversation.peerAvatar : activeConversation.propertyImage}
                          label={activeConversation.isHost ? activeConversation.peerName : activeConversation.propertyTitle}
                          size="sm"
                        />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">{activeConversation.propertyTitle}</p>
                          {activeConversation.isHost ? <p className="truncate text-xs text-slate-500">{activeConversation.guestName}</p> : null}
                        </div>
                      </button>
                      {menuOpen ? (
                        <div className="absolute left-3 top-14 z-10 w-48 overflow-hidden rounded-lg border border-slate-200 bg-white text-sm shadow-xl">
                          <button type="button" className="block w-full px-4 py-3 text-left text-slate-600 hover:bg-slate-50">Báo cáo</button>
                          <button type="button" onClick={hideConversation} className="block w-full px-4 py-3 text-left text-rose-600 hover:bg-rose-50">Xoá cuộc trò chuyện</button>
                        </div>
                      ) : null}
                    </div>

                    <div className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain bg-slate-50 px-3 py-4">
                      {activeConversation.messages.map((item) => (
                        <div key={item.id} className={`flex ${item.mine ? "justify-end" : "justify-start"}`}>
                          <div className={`max-w-[82%] rounded-2xl px-3 py-2 text-sm leading-5 ${item.mine ? "bg-teal-700 text-white" : "bg-slate-200 text-slate-950"}`}>
                            {item.body ? <p className="whitespace-pre-line">{item.body}</p> : null}
                            {item.imageUrl ? <img src={item.imageUrl} alt="" className="mt-2 max-h-44 rounded-lg object-cover" /> : null}
                          </div>
                        </div>
                      ))}
                      <div ref={messagesEndRef} />
                    </div>

                    <form onSubmit={sendMessage} className="flex shrink-0 items-center gap-2 border-t border-slate-200 px-3 py-3">
                      <button type="button" onClick={() => imageInputRef.current?.click()} className="grid h-9 w-9 place-items-center rounded-full text-teal-800 hover:bg-teal-50" aria-label="Gửi ảnh">
                        +
                      </button>
                      <input
                        ref={imageInputRef}
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        onChange={(event) => {
                          sendImage(event.target.files?.[0]);
                          event.currentTarget.value = "";
                        }}
                      />
                      <input
                        value={message}
                        onChange={(event) => setMessage(event.target.value)}
                        placeholder="Aa"
                        className="h-10 min-w-0 flex-1 rounded-full bg-slate-100 px-4 text-sm outline-none focus:ring-2 focus:ring-teal-100"
                      />
                      <button type="submit" disabled={sending || !message.trim()} className="grid h-10 w-10 place-items-center rounded-full bg-teal-700 text-white disabled:cursor-not-allowed disabled:opacity-40" aria-label="Gửi tin nhắn">
                        ➤
                      </button>
                    </form>
                  </>
                ) : (
                  <div className="grid flex-1 place-items-center px-6 text-center text-sm text-slate-500">Chọn một cuộc trò chuyện</div>
                )}
              </div>
            </div>
          )}
        </section>
      ) : null}
    </>
  );
}

function Avatar({ src, label, size = "md" }: { src: string | null; label: string; size?: "sm" | "md" | "lg" }) {
  const className = size === "sm" ? "h-9 w-9" : size === "lg" ? "h-14 w-14" : "h-12 w-12";
  return (
    <span className={`relative grid shrink-0 place-items-center overflow-hidden rounded-full bg-teal-700 text-sm font-bold text-white ${className}`}>
      {src ? <Image src={src} alt={label} fill unoptimized sizes="48px" className="object-cover" /> : label.slice(0, 1).toUpperCase()}
    </span>
  );
}
