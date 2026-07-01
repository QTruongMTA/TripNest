"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api/v1";

const QUICK_TEMPLATES_GUEST = [
  "Xin chào host! Tôi muốn hỏi thêm về phòng.",
  "Cảm ơn bạn đã xác nhận đặt phòng!",
  "Tôi sẽ đến vào khoảng mấy giờ có được không?",
  "Có thể cho tôi biết cách nhận phòng không?",
];

const QUICK_TEMPLATES_HOST = [
  "Xin chào! Cảm ơn bạn đã đặt phòng.",
  "Tôi đã xác nhận đơn đặt của bạn.",
  "Bạn có thể nhận phòng từ 14:00 và trả phòng trước 12:00.",
  "Nếu cần hỗ trợ, vui lòng liên hệ tôi trực tiếp.",
];

type Message = {
  id: string;
  bookingId: string;
  senderId: string | null;
  senderRole: string;
  senderName: string | null;
  senderAvatar: string | null;
  message: string;
  isReadByGuest: boolean;
  isReadByHost: boolean;
  createdAt: string;
};

type Props = {
  bookingId: string;
  viewerRole: "GUEST" | "HOST";
  messagesPath: string;
};

function formatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const isToday =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();
  if (isToday) {
    return d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" }) +
    " " + d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
}

function getToken(): string | null {
  try {
    return typeof window !== "undefined" ? localStorage.getItem("token") : null;
  } catch {
    return null;
  }
}

export default function MessageThread({ bookingId, viewerRole, messagesPath }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const templates = viewerRole === "GUEST" ? QUICK_TEMPLATES_GUEST : QUICK_TEMPLATES_HOST;

  const fetchMessages = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    try {
      const res = await fetch(`${API}${messagesPath}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const json = await res.json();
      setMessages(json.data ?? []);
    } catch {
      // silent poll failure
    } finally {
      setLoading(false);
    }
  }, [messagesPath]);

  // Reset thread state when the underlying booking changes
  useEffect(() => {
    setMessages([]);
    setLoading(true);
    setError(null);
  }, [bookingId]);

  // Initial load (also re-runs when messagesPath changes, which happens with bookingId)
  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Poll every 30s
  useEffect(() => {
    const id = setInterval(fetchMessages, 30_000);
    return () => clearInterval(id);
  }, [fetchMessages]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    const token = getToken();
    if (!token) return;

    setSending(true);
    setError(null);
    try {
      const res = await fetch(`${API}${messagesPath}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: trimmed }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError(json?.error?.message ?? "Không thể gửi tin nhắn.");
        return;
      }
      const json = await res.json();
      setMessages((prev) => [...prev, json.data]);
      setDraft("");
    } catch {
      setError("Lỗi kết nối. Vui lòng thử lại.");
    } finally {
      setSending(false);
      textareaRef.current?.focus();
    }
  }, [messagesPath, sending]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        sendMessage(draft);
      }
    },
    [draft, sendMessage],
  );

  if (loading) {
    return (
      <div style={{ padding: "24px", textAlign: "center", color: "#6b7280", fontSize: "14px" }}>
        Đang tải tin nhắn...
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "480px", border: "1px solid #e5e7eb", borderRadius: "12px", overflow: "hidden", background: "#fff" }}>
      {/* Header */}
      <div style={{ padding: "12px 16px", borderBottom: "1px solid #e5e7eb", background: "#f9fafb", display: "flex", alignItems: "center", gap: "8px" }}>
        <span style={{ fontSize: "16px" }}>💬</span>
        <span style={{ fontWeight: 600, fontSize: "14px", color: "#111827" }}>Tin nhắn đặt phòng</span>
        <span style={{ marginLeft: "auto", fontSize: "12px", color: "#6b7280" }}>{messages.length} tin</span>
      </div>

      {/* Message list */}
      <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px", display: "flex", flexDirection: "column", gap: "8px" }}>
        {messages.length === 0 && (
          <div style={{ textAlign: "center", color: "#9ca3af", fontSize: "13px", marginTop: "32px" }}>
            Chưa có tin nhắn nào. Hãy bắt đầu cuộc trò chuyện!
          </div>
        )}
        {messages.map((msg) => {
          const isSystem = msg.senderRole === "SYSTEM";
          const isMine = msg.senderRole === viewerRole;

          if (isSystem) {
            return (
              <div key={msg.id} style={{ textAlign: "center" }}>
                <span style={{
                  display: "inline-block", padding: "4px 12px", background: "#f3f4f6",
                  borderRadius: "99px", fontSize: "12px", color: "#6b7280",
                }}>
                  {msg.message}
                </span>
                <div style={{ fontSize: "10px", color: "#9ca3af", marginTop: "2px" }}>
                  {formatTime(msg.createdAt)}
                </div>
              </div>
            );
          }

          return (
            <div key={msg.id} style={{ display: "flex", flexDirection: "column", alignItems: isMine ? "flex-end" : "flex-start" }}>
              {!isMine && (
                <span style={{ fontSize: "11px", color: "#6b7280", marginBottom: "2px", paddingLeft: "4px" }}>
                  {msg.senderName ?? (msg.senderRole === "HOST" ? "Host" : "Khách")}
                </span>
              )}
              <div style={{
                maxWidth: "72%", padding: "8px 12px", borderRadius: "12px", fontSize: "14px", lineHeight: "1.5",
                background: isMine ? "#16a34a" : "#f3f4f6",
                color: isMine ? "#fff" : "#111827",
                borderBottomRightRadius: isMine ? "2px" : "12px",
                borderBottomLeftRadius: isMine ? "12px" : "2px",
              }}>
                {msg.message}
              </div>
              <span style={{ fontSize: "10px", color: "#9ca3af", marginTop: "2px", paddingLeft: "4px", paddingRight: "4px" }}>
                {formatTime(msg.createdAt)}
              </span>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Quick templates */}
      <div style={{ padding: "8px 16px 0", display: "flex", gap: "6px", overflowX: "auto", flexShrink: 0 }}>
        {templates.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => sendMessage(t)}
            disabled={sending}
            style={{
              flexShrink: 0, padding: "4px 10px", border: "1px solid #d1d5db",
              borderRadius: "99px", background: "#fff", fontSize: "12px", color: "#374151",
              cursor: "pointer", whiteSpace: "nowrap",
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Input area */}
      <div style={{ padding: "8px 16px 12px", display: "flex", gap: "8px", alignItems: "flex-end" }}>
        <textarea
          ref={textareaRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Nhập tin nhắn... (Ctrl+Enter để gửi)"
          rows={2}
          style={{
            flex: 1, resize: "none", padding: "8px 12px", border: "1px solid #d1d5db",
            borderRadius: "8px", fontSize: "14px", outline: "none", fontFamily: "inherit",
            lineHeight: "1.5",
          }}
        />
        <button
          type="button"
          onClick={() => sendMessage(draft)}
          disabled={sending || !draft.trim()}
          style={{
            padding: "8px 16px", background: draft.trim() && !sending ? "#16a34a" : "#d1d5db",
            color: "#fff", border: "none", borderRadius: "8px", fontSize: "14px",
            cursor: draft.trim() && !sending ? "pointer" : "default", fontWeight: 600,
            transition: "background 0.15s",
          }}
        >
          {sending ? "..." : "Gửi"}
        </button>
      </div>

      {error && (
        <div style={{ padding: "0 16px 8px", fontSize: "12px", color: "#dc2626" }}>{error}</div>
      )}
    </div>
  );
}
