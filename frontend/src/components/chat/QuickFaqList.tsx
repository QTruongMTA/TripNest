"use client";

import { openChatWidget } from "@/components/chat/ChatWidget";

type QuickFaq = {
  id: string;
  question: string;
  answer?: string;
};

type QuickFaqListProps = {
  propertyId: string;
  faqs: QuickFaq[];
};

export function QuickFaqList({ propertyId, faqs }: QuickFaqListProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      {faqs.map((faq) => {
        const question = faq.question.trim();
        return (
          <button
            key={faq.id}
            type="button"
            onClick={() => {
              if (!question) return;
              openChatWidget({ propertyId, quickMessage: question });
            }}
            className="flex w-full items-center justify-between gap-4 border-b border-slate-200 px-5 py-4 text-left transition last:border-b-0 hover:bg-teal-50"
          >
            <span className="text-base font-medium text-slate-950">{question || "Câu hỏi chưa có tiêu đề"}</span>
            <span className="text-2xl leading-none text-teal-800">›</span>
          </button>
        );
      })}
    </div>
  );
}
