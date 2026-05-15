"use client";

import { useState, useCallback, FormEvent, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  isProblemLoaded?: boolean;
}

export default function AiMentorChat({
  problem,
  code,
  language,
  isProblemLoaded = false,
}: AiMentorChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [nextId, setNextId] = useState(1);
  const [isInterviewMode, setIsInterviewMode] = useState(false);
  const [interviewDifficulty, setInterviewDifficulty] = useState<string | null>(null);
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
    // If we're setting difficulty
    if (["Beginner", "Intermediate", "Advanced", "FAANG level"].includes(actionText) && isInterviewMode && !interviewDifficulty) {
      setInterviewDifficulty(actionText);
      
      // Auto-send a message indicating difficulty choice
      const textToSubmit = `I would like a ${actionText} difficulty interview please.`;
      
      setTimeout(() => {
        const formEvent = { preventDefault: () => {} } as FormEvent;
        handleSubmit(formEvent, textToSubmit);
      }, 0);
      return;
    }

    setInput(actionText);
    // Use setTimeout to allow state to update before submit
    setTimeout(() => {
      const formEvent = { preventDefault: () => {} } as FormEvent;
      handleSubmit(formEvent, actionText);
    }, 0);
  };
  
  const handleToggleInterviewMode = () => {
    setIsInterviewMode(prev => {
      const nextMode = !prev;
      if (nextMode) {
        // Turning ON
        setInterviewDifficulty(null);
        
        // Add Lucy's greeting for interview mode locally to guide them
        const greetingMsg: ChatMessage = {
          id: nextId,
          role: "assistant",
          content: "Welcome to Interview Mode! What difficulty level interview would you like? Choose an option below."
        };
        setMessages(prevMsgs => [...prevMsgs, greetingMsg]);
        setNextId(id => id + 1);
      } else {
        // Turning OFF
        setInterviewDifficulty(null);
        
        const exitMsg: ChatMessage = {
          id: nextId,
          role: "assistant",
          content: "Interview Mode deactivated. I'm back to being your regular coding mentor. How can I help?"
        };
        setMessages(prevMsgs => [...prevMsgs, exitMsg]);
        setNextId(id => id + 1);
      }
      return nextMode;
    });
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
            history: messages,
            isInterviewMode,
            interviewDifficulty,
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
        className="fixed bottom-4 right-4 z-30 flex items-center gap-2 rounded-full border border-[#3a3a3a] bg-[#252526] px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition-transform hover:scale-105 hover:bg-[#2a2a2a]"
      >
        <span>✨</span> Chat with Lucy
      </button>

      {/* Slide-in panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed inset-y-0 right-0 z-40 w-full max-w-md shadow-2xl overflow-hidden"
          >
            <div className="flex h-full flex-col border-l border-slate-800/60 bg-[#0b1120]">
              {/* Header */}
                <div className="flex items-center justify-between border-b border-[#3a3a3a] bg-[#2a2a2a] px-4 py-4 z-10">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="relative flex h-11 w-11 items-center justify-center rounded-full bg-slate-800 ring-1 ring-white/10 overflow-hidden">
                      <img 
                        src="/lucy.png" 
                        alt="Lucy Avatar"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          e.currentTarget.parentElement!.innerHTML = '<span class="text-xl">🌻</span>';
                        }}
                        />
                      </div>
                      <div className="absolute bottom-0.5 right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#1c2128] bg-emerald-500" />
                    </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <p className="text-base font-bold text-white tracking-tight">Lucy 🌻</p>
                    </div>
                    <p className={`text-[11px] font-semibold tracking-wide uppercase ${isInterviewMode ? "text-amber-400" : "text-emerald-400/90"}`}>
                      AI DSA Mentor
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold tracking-wider uppercase transition-colors ${isInterviewMode ? "text-amber-400" : "text-neutral-500"}`}>Interview</span>
                    <button 
                      onClick={handleToggleInterviewMode}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ${isInterviewMode ? "bg-amber-600" : "bg-slate-700"}`}
                    >
                      <span className={`pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-white transition duration-200 ${isInterviewMode ? "translate-x-4" : "translate-x-0"}`} />
                    </button>
                    {isInterviewMode && (
                      <motion.span 
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="ml-1 flex h-2 w-2 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,1)]" 
                      />
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={toggleOpen}
                    className="rounded-full p-2 text-neutral-500 hover:text-white transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                  </button>
                </div>
              </div>

              {/* Messages Area */}
              <div className="flex-1 space-y-8 overflow-y-auto px-5 py-6 text-sm flex flex-col scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
                {messages.length === 0 ? (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col items-center justify-center h-full m-auto text-center space-y-6"
                  >
                    <div className="relative group">
                      <div className="absolute -inset-4 rounded-full bg-emerald-500/10 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                      <div className="h-24 w-24 rounded-full bg-slate-800/50 flex items-center justify-center ring-4 ring-emerald-500/10 shadow-2xl shadow-emerald-500/5 overflow-hidden relative">
                        <img 
                          src="/lucy.png" 
                          alt="Lucy Welcome"
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.parentElement!.innerHTML = '<span class="text-5xl group-hover:animate-[bounce_2s_infinite]">🌻</span>';
                          }}
                        />
                      </div>
                    </div>
                    <div className="space-y-3 px-6">
                      <h3 className="text-2xl text-white font-bold tracking-tight">
                        Hi! I'm Lucy 🌻
                      </h3>
                      <p className="text-emerald-400 font-semibold tracking-wide text-[11px] uppercase">
                        Your Lucy AI assistant
                      </p>
                      <div className="h-px w-10 bg-slate-800/80 mx-auto my-4" />
                      {!isProblemLoaded ? (
                        <div className="space-y-2">
                          <p className="text-neutral-400 text-sm leading-relaxed max-w-[280px] mx-auto">
                            No problem loaded yet! Paste or import a problem statement to get started.
                          </p>
                          <p className="text-neutral-500 text-xs leading-relaxed max-w-[260px] mx-auto">
                            I'll help you understand and solve it step-by-step. 🚀
                          </p>
                        </div>
                      ) : (
                        <p className="text-neutral-400 text-sm leading-relaxed max-w-[280px] mx-auto">
                          I'm here to help you master DSA. How would you like to explore this problem today?
                        </p>
                      )}
                    </div>
                  </motion.div>
                ) : (
                  messages.map((msg, idx) => (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx === messages.length - 1 ? 0 : 0.05 }}
                      className={`flex w-full ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div className={`flex flex-col max-w-[85%] ${msg.role === "user" ? "items-end" : "items-start"}`}>
                        <div className="flex items-center gap-2 mb-2 px-1">
                          <span className="text-[9px] text-neutral-500 font-black tracking-[0.15em] uppercase">
                            {msg.role === "user" ? "YOU" : "LUCY"}
                          </span>
                        </div>
                        <div
                          className={`rounded-xl px-4 py-3 border transition-colors ${
                            msg.role === "user"
                              ? "bg-slate-700 border-[#4a4a4a] text-white rounded-tr-sm"
                              : "bg-[#2a2a2a] border-[#3a3a3a] text-slate-100 rounded-tl-sm"
                          }`}
                        >
                          <div className="prose prose-sm prose-invert max-w-none prose-p:leading-relaxed prose-pre:bg-transparent prose-pre:border prose-pre:border-slate-800 prose-code:text-emerald-300">
                            <ReactMarkdown 
                              remarkPlugins={[remarkGfm]}
                              components={{
                                code: ({ node, inline, ...props }: any) => {
                                  return inline 
                                    ? <code className="bg-slate-900/80 text-emerald-400 px-1.5 py-0.5 rounded text-[11px] font-mono border border-slate-700/30 font-bold" {...props} /> 
                                    : <pre className="font-mono bg-[#0b1120] p-4 rounded-xl text-xs overflow-x-auto text-neutral-300 my-4 shadow-2xl border border-slate-800/80 leading-relaxed"><code {...props} /></pre>
                                }
                              }}
                            >
                              {msg.content}
                            </ReactMarkdown>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
                
                {isSending && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex w-full justify-start mt-2"
                  >
                    <div className="flex flex-col max-w-[85%] items-start">
                      <div className="flex items-center gap-2 mb-2 px-1">
                        <span className="text-[9px] text-neutral-500 font-black tracking-[0.15em] uppercase">LUCY</span>
                      </div>
                      <div className="rounded-xl px-5 py-3 bg-[#2a2a2a] border border-[#3a3a3a] text-neutral-400 rounded-tl-sm text-xs flex items-center gap-4">
                        <span className="italic font-medium">Lucy is thinking</span>
                        <div className="flex gap-1.5 items-center">
                          {[0, 1, 2].map((i) => (
                            <motion.span
                              key={i}
                              animate={{ 
                                opacity: [0.2, 1, 0.2]
                              }}
                              transition={{ 
                                duration: 1.2, 
                                repeat: Infinity, 
                                delay: i * 0.2,
                                ease: "easeInOut"
                              }}
                              className="w-1 h-1 bg-slate-500 rounded-full"
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
                <div ref={messagesEndRef} className="h-6 shrink-0" />
              </div>

              {/* Footer / Input Area */}
              <div className="border-t border-[#3a3a3a] bg-[#1a1a1a] px-5 py-6 flex flex-col gap-6">
                {/* Quick Actions */}
                <div className="flex flex-col gap-4">
                  {isInterviewMode && !interviewDifficulty ? (
                    <div className="flex flex-wrap gap-2 animate-in fade-in slide-in-from-bottom-2 duration-500">
                      <p className="w-full text-[9px] font-black text-neutral-600 uppercase tracking-[0.2em] mb-1 ml-1">Select Difficulty</p>
                      {["Beginner", "Intermediate", "Advanced", "FAANG level"].map((action) => (
                        <button 
                          key={action}
                          onClick={() => handleQuickAction(action)}
                          className="px-4 py-1.5 rounded-full bg-[#333333] border border-[#3a3a3a] text-[11px] font-bold text-neutral-300 hover:bg-[#404040] transition-colors"
                        >
                          {action}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <p className="text-[9px] font-black text-neutral-600 uppercase tracking-[0.2em] ml-1">APPROACH</p>
                        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide no-scrollbar">
                          {["Brute force approach", "Better approach", "Optimal solution"].map((action) => (
                             <button 
                              key={action}
                              onClick={() => handleQuickAction(action)}
                              className="whitespace-nowrap px-4 py-2 rounded-lg bg-[#333333] border border-[#3a3a3a] text-[11px] font-bold text-neutral-400 hover:bg-[#404040] hover:text-white transition-colors"
                            >
                              {action}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <p className="text-[9px] font-black text-neutral-600 uppercase tracking-[0.2em] ml-1">ASSISTANT</p>
                        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide no-scrollbar">
                          {["Help write code", "Debug code", "Check edge cases", "Explain complexity"].map((action) => (
                             <button 
                              key={action}
                              onClick={() => handleQuickAction(action)}
                              className="whitespace-nowrap px-4 py-2 rounded-lg bg-[#333333] border border-[#3a3a3a] text-[11px] font-bold text-neutral-400 hover:bg-[#404040] hover:text-white transition-colors"
                            >
                              {action}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <form onSubmit={(e) => handleSubmit(e)} className="relative">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask Lucy anything..."
                    className="w-full rounded-xl border border-[#4a4a4a] bg-[#1a1a1a] pl-5 pr-14 py-3 text-sm text-white outline-none placeholder:text-neutral-600 focus:border-slate-500 transition-colors"
                  />
                  <button
                    type="submit"
                    disabled={isSending || !input.trim()}
                    className="absolute right-2 top-2 bottom-2 w-10 rounded-lg bg-[#333333] flex items-center justify-center text-white border border-[#3a3a3a] transition-colors hover:bg-[#404040] disabled:opacity-30 disabled:grayscale transition-colors"
                  >
                    {isSending ? (
                      <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 19 7-7-7-7"/><path d="M5 12h14"/></svg>
                    )}
                  </button>
                </form>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </>
  );
}


