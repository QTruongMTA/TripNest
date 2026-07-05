"use client";

import { openChatWidget } from "@/components/chat/ChatWidget";

export function StartPropertyConversationButton({ propertyId }: { propertyId: string }) {
  return (
    <button
      type="button"
      onClick={() => openChatWidget({ propertyId })}
      className="w-full rounded-full bg-emerald-700 px-4 py-3 font-medium text-white transition hover:bg-emerald-800"
    >
      Nhắn tin với chỗ nghỉ
    </button>
  );
}
