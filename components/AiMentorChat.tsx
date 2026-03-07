"use client";

import { useState, useCallback, FormEvent } from "react";
import type { EditorLanguage } from "./CodeEditor";

type ChatMessage = {
  id: number;
  role: "user" | "assistant";
  content: string;
};

interface AiMentorChatProps {
  problem: string;
  code: string;
  language: EditorLanguage;
}

export default function AiMentorChat({
  problem,
  code,
  language,
}: AiMentorChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [nextId, setNextId] = useState(1);

  const toggleOpen = () => {
    setIsOpen((prev) => !prev);
  };

  const handleSubmit = useCallback(
    async (e?: FormEvent) => {
      if (e) e.preventDefault();
      const trimmed = input.trim();
      if (!trimmed || isSending) return;

      const userMessage: ChatMessage = {
        id: nextId,
        role: "user",
        content: trimmed,
      };

      setMessages((prev) => [...prev, userMessage]);
      setNextId((id) => id + 1);
      setInput("");
      setIsSending(true);

      try {
        const res = await fetch("/api/ai-chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            problem,
            code,
            language,
            message: trimmed,
          }),
        });

        if (!res.ok) {
          const errorMessage =
            "⚠️ Could not get AI mentor response. Please try again.";
          const errorMsg: ChatMessage = {
            id: userMessage.id + 100000,
            role: "assistant",
            content: errorMessage,
          };
          setMessages((prev) => [...prev, errorMsg]);
          return;
        }

        const data = await res.json();
        const reply =
          (data?.reply as string | undefined) ||
          "⚠️ Could not get AI mentor response. Please try again.";

        const assistantMessage: ChatMessage = {
          id: userMessage.id + 100000,
          role: "assistant",
          content: reply,
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } catch (err) {
        console.error("[AiMentorChat] Error:", err);
        const errorMsg: ChatMessage = {
          id: userMessage.id + 100000,
          role: "assistant",
          content:
            "⚠️ Could not reach the AI mentor. Please check your connection and try again.",
        };
        setMessages((prev) => [...prev, errorMsg]);
      } finally {
        setIsSending(false);
      }
    },
    [input, isSending, nextId, problem, code, language]
  );

  return (
    <>
      {/* Floating button */}
      <button
        type="button"
        onClick={toggleOpen}
        className="fixed bottom-4 right-4 z-30 rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-700/40 transition-transform hover:scale-105 hover:bg-emerald-500"
      >
        💬 AI Mentor
      </button>

      {/* Slide-in panel */}
      <div
        className={`fixed inset-y-0 right-0 z-40 w-full max-w-md transform bg-[#111827] text-gray-100 shadow-xl transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col border-l border-[#30363d]">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#30363d] bg-[#161b22] px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-white">
                AI Mentor Chat
              </p>
              <p className="text-xs text-gray-400">
                Ask questions about the current problem and your code.
              </p>
            </div>
            <button
              type="button"
              onClick={toggleOpen}
              className="rounded px-2 py-1 text-xs text-gray-400 transition-colors hover:bg-[#1f2933] hover:text-gray-200"
            >
              ✕
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3 text-sm">
            {messages.length === 0 ? (
              <p className="text-xs text-gray-500">
                Start the conversation by asking about the problem, your
                approach, or how to improve your solution.
              </p>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${
                    msg.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-3 py-2 ${
                      msg.role === "user"
                        ? "bg-emerald-600 text-white"
                        : "bg-[#1f2933] text-gray-100 border border-[#374151]"
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">
                      {msg.content}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Input area */}
          <form
            onSubmit={handleSubmit}
            className="border-t border-[#30363d] bg-[#111827] px-3 py-3"
          >
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask your mentor a question..."
                className="flex-1 rounded border border-[#374151] bg-[#0b1120] px-3 py-2 text-sm text-gray-100 outline-none placeholder:text-gray-500 focus:border-emerald-500"
              />
              <button
                type="submit"
                disabled={isSending || !input.trim()}
                className="rounded bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSending ? "Sending..." : "Send"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

