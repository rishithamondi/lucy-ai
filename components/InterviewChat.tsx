"use client";

import { useState, useCallback, FormEvent, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import type { EditorLanguage } from "./CodeEditor";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { UI_TOKENS } from "@/lib/theme";

import type { InterviewMessage } from "@/types/interview";

interface InterviewChatProps {
  messages: InterviewMessage[];
  onSendMessage: (msg: string, code?: string) => void;
  isLoading: boolean;
}

export default function InterviewChat({
  messages,
  onSendMessage,
  isLoading,
}: InterviewChatProps) {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSubmit = useCallback(
    (e?: FormEvent) => {
      if (e) e.preventDefault();
      const trimmed = input.trim();
      if (!trimmed || isLoading) return;

      onSendMessage(trimmed);
      setInput("");
    },
    [input, isLoading, onSendMessage]
  );

  return (
    <div className={`flex h-full flex-col ${UI_TOKENS.background.panel} border-l ${UI_TOKENS.border.primary}`}>
      {/* Messages Area */}
      <div className="flex-1 space-y-6 overflow-y-auto px-5 py-6 text-sm flex flex-col custom-scrollbar">
        {messages.map((msg, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className={`flex w-full ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div className={`flex flex-col max-w-[90%] ${msg.role === "user" ? "items-end" : "items-start"}`}>
              <div className="flex items-center gap-2 mb-1.5 px-1">
                <span className="text-[9px] text-slate-500 font-bold tracking-[0.1em] uppercase">
                  {msg.role === "user" ? "YOU" : "LUCY"}
                </span>
              </div>
              <div
                className={`rounded-xl px-4 py-3 border transition-colors ${
                  msg.role === "user"
                    ? "bg-[#2a2a2a] border-[#3a3a3a] text-white rounded-tr-sm"
                    : "bg-[#252526] border-[#3a3a3a] text-slate-200 rounded-tl-sm"
                }`}
              >
                <div className="prose prose-sm prose-invert max-w-none prose-p:leading-relaxed prose-pre:bg-[#0d1117] prose-pre:border prose-pre:border-slate-800 prose-code:text-emerald-300">
                  <ReactMarkdown 
                    remarkPlugins={[remarkGfm]}
                    components={{
                      code: ({ node, inline, ...props }: any) => {
                        return inline 
                          ? <code className="bg-slate-900/80 text-emerald-400 px-1.5 py-0.5 rounded text-[11px] font-mono border border-slate-700/30 font-bold" {...props} /> 
                          : <pre className="font-mono bg-[#0b1120] p-3 rounded-xl text-xs overflow-x-auto text-slate-300 my-2 border border-slate-800/80 leading-relaxed"><code {...props} /></pre>
                      }
                    }}
                  >
                    {msg.content}
                  </ReactMarkdown>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
        
        {isLoading && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex w-full justify-start mt-2"
          >
            <div className="flex flex-col max-w-[85%] items-start">
              <div className="flex items-center gap-2 mb-1.5 px-1">
                <span className="text-[9px] text-slate-500 font-bold tracking-[0.1em] uppercase">LUCY</span>
              </div>
              <div className="rounded-xl px-5 py-3 bg-[#252526] border border-[#3a3a3a] text-slate-400 rounded-tl-sm text-xs flex items-center gap-4">
                <span className="italic font-medium">Lucy is evaluating</span>
                <div className="flex gap-1.5 items-center">
                  {[0, 1, 2].map((i) => (
                    <motion.span
                      key={i}
                      animate={{ opacity: [0.2, 1, 0.2] }}
                      transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2, ease: "easeInOut" }}
                      className="w-1.5 h-1.5 bg-emerald-500/70 rounded-full"
                    />
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
        <div ref={messagesEndRef} className="h-4 shrink-0" />
      </div>

      {/* Footer / Input Area */}
      <div className={`border-t ${UI_TOKENS.border.primary} ${UI_TOKENS.background.main} px-5 py-4`}>
        <form onSubmit={handleSubmit} className="relative flex items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading || messages.length === 0}
            placeholder={isLoading ? "Wait for Lucy..." : "Explain your reasoning..."}
            className={`w-full rounded-xl border ${UI_TOKENS.border.secondary} ${UI_TOKENS.background.input} pl-4 pr-12 py-3.5 text-sm text-white outline-none placeholder:text-slate-500 focus:border-emerald-500/50 transition-colors disabled:opacity-50`}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className={`absolute right-2 flex w-9 h-9 items-center justify-center rounded-lg ${UI_TOKENS.accent.emeraldBg} ${UI_TOKENS.accent.emerald} hover:bg-emerald-500/30 disabled:opacity-30 disabled:grayscale transition-colors`}
          >
            {isLoading ? (
               <div className="h-4 w-4 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
