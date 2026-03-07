"use client";

import { useState, useCallback, FormEvent, useRef, useEffect } from "react";
import type { EditorLanguage } from "./CodeEditor";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isSending]);

  const toggleOpen = () => {
    setIsOpen((prev) => !prev);
  };

  const handleQuickAction = (actionText: string) => {
    setInput(actionText);
    // Use setTimeout to allow state to update before submit
    setTimeout(() => {
      const formEvent = { preventDefault: () => {} } as FormEvent;
      handleSubmit(formEvent, actionText);
    }, 0);
  };

  const handleSubmit = useCallback(
    async (e?: FormEvent, overrideInput?: string) => {
      if (e) e.preventDefault();
      const textToSubmit = overrideInput !== undefined ? overrideInput : input;
      const trimmed = textToSubmit.trim();
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
              <div className="mt-1 h-[1px] w-8 bg-emerald-600 rounded"></div>
              <p className="mt-1 text-xs text-gray-400">
                Ask questions about the current problem or your solution.
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
          <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4 text-sm flex flex-col">
            {messages.length === 0 ? (
              <p className="text-xs text-slate-500 m-auto text-center italic">
                Start the conversation by asking about the problem, your
                approach, or how to improve your solution.
              </p>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex w-full ${
                    msg.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[85%] rounded-lg px-3 py-2 whitespace-pre-wrap break-words ${
                      msg.role === "user"
                        ? "bg-cyan-700 text-white"
                        : "bg-[#0f2438] text-slate-200 border border-slate-700/50"
                    }`}
                  >
                    <div className="prose prose-sm prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                      <ReactMarkdown 
                        remarkPlugins={[remarkGfm]}
                        components={{
                          code: ({ node, ...props }: any) => {
                            const isInline = !String(props.children).includes('\n');
                            return isInline 
                              ? <code className="bg-slate-800 text-cyan-300 px-1 py-0.5 rounded text-xs" {...props} /> 
                              : <pre className="font-mono bg-slate-900 p-3 rounded text-xs overflow-x-auto text-slate-300 my-2"><code {...props} /></pre>
                          },
                          p: ({ node, ...props }) => <p className="leading-relaxed whitespace-pre-wrap break-words m-0 p-0" {...props} />
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                  </div>
                </div>
              ))
            )}
            
            {isSending && (
              <div className="flex w-full justify-start">
                <div className="max-w-[85%] rounded-lg px-3 py-2 bg-[#0f2438] text-slate-400 border border-slate-700/50 text-xs italic flex items-center gap-2">
                  <span className="flex gap-1">
                    <span className="animate-bounce block w-1 h-1 bg-slate-400 rounded-full" style={{ animationDelay: '0ms' }}></span>
                    <span className="animate-bounce block w-1 h-1 bg-slate-400 rounded-full" style={{ animationDelay: '150ms' }}></span>
                    <span className="animate-bounce block w-1 h-1 bg-slate-400 rounded-full" style={{ animationDelay: '300ms' }}></span>
                  </span>
                  AI Mentor is typing...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} className="h-1 shrink-0" />
          </div>

          {/* Input area */}
          <div className="border-t border-[#30363d] bg-[#111827] px-3 py-3 flex flex-col gap-3">
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              <button 
                onClick={() => handleQuickAction("Explain my code")}
                className="whitespace-nowrap px-3 py-1.5 rounded-full bg-[#1f2933] border border-slate-700 text-xs text-slate-300 hover:bg-[#2d3748] hover:text-white transition-colors"
              >
                Explain my code
              </button>
              <button 
                onClick={() => handleQuickAction("Why is my code wrong?")}
                className="whitespace-nowrap px-3 py-1.5 rounded-full bg-[#1f2933] border border-slate-700 text-xs text-slate-300 hover:bg-[#2d3748] hover:text-white transition-colors"
              >
                Why is my code wrong?
              </button>
              <button 
                onClick={() => handleQuickAction("Suggest optimization")}
                className="whitespace-nowrap px-3 py-1.5 rounded-full bg-[#1f2933] border border-slate-700 text-xs text-slate-300 hover:bg-[#2d3748] hover:text-white transition-colors"
              >
                Suggest optimization
              </button>
            </div>
            <form onSubmit={(e) => handleSubmit(e)}>
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
      </div>
    </>
  );
}

