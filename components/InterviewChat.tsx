"use client";

import { useState, useCallback, FormEvent, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import type { EditorLanguage } from "./CodeEditor";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type ChatMessage = {
  id: number;
  role: "user" | "assistant";
  content: string;
};

interface InterviewChatProps {
  problem: string;
  code: string;
  language: EditorLanguage;
  isProblemLoaded: boolean;
  difficulty: string;
}

export default function InterviewChat({
  problem,
  code,
  language,
  isProblemLoaded,
  difficulty,
}: InterviewChatProps) {
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

  // Initial greeting
  useEffect(() => {
    if (messages.length === 0) {
      const startMsg: ChatMessage = {
        id: 0,
        role: "assistant",
        content: `Welcome to the Interview Mode. We will be doing a ${difficulty.toUpperCase()} level interview. Please wait, starting the session...`
      };
      setMessages([startMsg]);
      
      // Auto-trigger the first message to AI to start the interview
      const startInterviewAsync = async () => {
        setIsSending(true);
        try {
          const res = await fetch("/api/ai-chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              problem,
              code,
              language,
              message: "Start the interview.", // Hidden trigger message
              history: [], // Send empty history to get the actual first question
              isInterviewMode: true,
              interviewDifficulty: difficulty,
            }),
          });
          
          if (!res.ok) throw new Error("Failed to start");
          const data = await res.json();
          const reply = data?.reply || "Could not start interview. Please try again.";
          
          setMessages([
            {
              id: 1,
              role: "assistant",
              content: reply,
            }
          ]);
          setNextId(2);
        } catch (err) {
          console.error(err);
          setMessages(prev => [
             ...prev,
            { id: 1, role: "assistant", content: "Error starting interview connection. Please refresh." }
          ]);
        } finally {
          setIsSending(false);
        }
      };
      
      startInterviewAsync();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [difficulty]);

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
            history: messages,
            isInterviewMode: true,
            interviewDifficulty: difficulty,
          }),
        });

        if (!res.ok) {
          const errorMessage = "⚠️ Connection error. Please try again.";
          const errorMsg: ChatMessage = { id: nextId + 1, role: "assistant", content: errorMessage };
          setMessages((prev) => [...prev, errorMsg]);
          setNextId(id => id + 2);
          return;
        }

        const data = await res.json();
        const reply = data?.reply || "⚠️ Error receiving response.";

        const assistantMessage: ChatMessage = { id: nextId + 1, role: "assistant", content: reply };
        setMessages((prev) => [...prev, assistantMessage]);
        setNextId(id => id + 2);
      } catch (err) {
        console.error("[InterviewChat] Error:", err);
        const errorMsg: ChatMessage = {
          id: nextId + 1, role: "assistant",
          content: "⚠️ Connection error.",
        };
        setMessages((prev) => [...prev, errorMsg]);
        setNextId(id => id + 2);
      } finally {
        setIsSending(false);
      }
    },
    [input, isSending, nextId, problem, code, language, messages, difficulty]
  );

  return (
    <div className="flex h-full flex-col bg-[#0F172A] border-l border-white/10">
      {/* Messages Area */}
      <div className="flex-1 space-y-6 overflow-y-auto px-5 py-6 text-sm flex flex-col custom-scrollbar">
        {messages.map((msg, idx) => (
          <motion.div
            key={msg.id}
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
                    ? "bg-slate-800/80 border-white/10 text-white rounded-tr-sm"
                    : "bg-[#1c2128] border-white/5 text-slate-200 rounded-tl-sm"
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
        
        {isSending && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex w-full justify-start mt-2"
          >
            <div className="flex flex-col max-w-[85%] items-start">
              <div className="flex items-center gap-2 mb-1.5 px-1">
                <span className="text-[9px] text-slate-500 font-bold tracking-[0.1em] uppercase">LUCY</span>
              </div>
              <div className="rounded-xl px-5 py-3 bg-[#1c2128] border border-white/5 text-slate-400 rounded-tl-sm text-xs flex items-center gap-4">
                <span className="italic font-medium">Lucy is evaluating</span>
                <div className="flex gap-1.5 items-center">
                  {[0, 1, 2].map((i) => (
                    <motion.span
                      key={i}
                      animate={{ opacity: [0.2, 1, 0.2] }}
                      transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2, ease: "easeInOut" }}
                      className="w-1.5 h-1.5 bg-amber-500/70 rounded-full"
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
      <div className="border-t border-white/10 bg-[#0B0F14] px-5 py-4">
        <form onSubmit={handleSubmit} className="relative flex items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isSending || messages.length === 0}
            placeholder={isSending ? "Wait for Lucy..." : "Explain your reasoning..."}
            className="w-full rounded-xl border border-white/10 bg-[#0F172A] pl-4 pr-12 py-3.5 text-sm text-white outline-none placeholder:text-slate-500 focus:border-amber-500/50 transition-colors disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isSending || !input.trim()}
            className="absolute right-2 flex w-9 h-9 items-center justify-center rounded-lg bg-amber-600/20 text-amber-500 hover:bg-amber-600/30 hover:text-amber-400 disabled:opacity-30 disabled:grayscale transition-colors"
          >
            {isSending ? (
               <div className="h-4 w-4 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
