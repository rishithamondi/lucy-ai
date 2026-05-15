"use client";

import { useState, useEffect } from "react";
import { Panel, Group, Separator } from "react-resizable-panels";
import CodeEditor, { type EditorLanguage } from "@/components/CodeEditor";
import InterviewChat from "@/components/InterviewChat";
import { defaultCode } from "@/components/CodeEditor";

interface InterviewModeProps {
  problemMeta: {
    title: string;
    description: string;
    constraints: string[];
    examples: Array<{ input: string; output: string }>;
  };
  code: string;
  setCode: (c: string) => void;
  language: EditorLanguage;
  setLanguage: (lang: EditorLanguage) => void;
  onExit: () => void;
  isProblemLoaded: boolean;
}

export default function InterviewMode({
  problemMeta,
  code,
  setCode,
  language,
  setLanguage,
  onExit,
  isProblemLoaded,
}: InterviewModeProps) {
  const [difficulty, setDifficulty] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(25 * 60); // 25 minutes
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [isEnded, setIsEnded] = useState(false); // Interview finished

  // Timer logic
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerRunning && timeLeft > 0) {
      interval = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    } else if (timeLeft === 0) {
      setIsTimerRunning(false);
      setIsEnded(true);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timeLeft]);

  const handleStartInterview = (selectedDiff: string) => {
    setDifficulty(selectedDiff);
    setIsTimerRunning(true);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Difficulty Selector Overlay
  if (!difficulty) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0B0F14] text-white">
        <div className="w-full max-w-md p-8 rounded-2xl bg-[#0F172A] border border-[#4a4a4a] shadow-2xl text-center space-y-8">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-tight">Setup Interview</h2>
            <p className="text-neutral-400 text-sm">Select a difficulty to begin the 25-minute interview.</p>
          </div>
          <div className="grid grid-cols-1 gap-3">
            {["Beginner", "Intermediate", "Advanced", "FAANG level"].map((diff) => (
              <button
                key={diff}
                onClick={() => handleStartInterview(diff)}
                className="w-full rounded-xl bg-[#2a2a2a] border border-[#3a3a3a] py-3 text-sm font-bold text-neutral-300 hover:bg-[#404040] hover:text-white transition-colors"
              >
                {diff}
              </button>
            ))}
          </div>
          <button onClick={onExit} className="text-sm font-semibold text-neutral-500 hover:text-neutral-300 transition-colors">
            Cancel and Return
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#0B0F14] text-white">
      {/* Header */}
      <header className="flex shrink-0 items-center justify-between border-b border-[#4a4a4a] bg-[#0F172A] px-6 py-3">
        <div className="flex items-center gap-4">
          <img src="/lucy.png" alt="Lucy AI Logo" className="w-6 h-6 object-contain" />
          <h1 className="text-lg font-bold tracking-tight">Lucy AI</h1>
          <div className="h-4 w-px bg-white/10" />
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)] animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-widest text-amber-500">Interview Mode</span>
            <span className="rounded bg-white/5 px-2 py-0.5 text-[10px] font-bold uppercase text-neutral-400 border border-[#3a3a3a]">
              {difficulty}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-6">
          {/* Timer */}
          <div className="flex items-center gap-2 bg-[#2a2a2a] border border-[#3a3a3a] rounded-lg px-3 py-1.5">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={timeLeft < 300 ? "#ef4444" : "#94a3b8"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            <span className={`text-sm font-mono font-bold ${timeLeft < 300 ? "text-red-400" : "text-neutral-300"}`}>
              {formatTime(timeLeft)}
            </span>
          </div>

          <button
            onClick={onExit}
            className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-1.5 text-xs font-bold text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-colors"
          >
            End Interview
          </button>
        </div>
      </header>

      {/* Main Split Layout */}
      <div className="min-h-0 flex-1 overflow-hidden">
        <Group orientation="horizontal">
          {/* LEFT: Problem & Editor */}
          <Panel defaultSize={65} minSize={40} className="flex flex-col bg-[#0B0F14]">
            <Group orientation="vertical">
              {/* Problem Panel */}
              <Panel defaultSize={40} minSize={20} className="overflow-y-auto custom-scrollbar p-6 space-y-6">
                <div className="space-y-2">
                  <h1 className="text-2xl font-bold text-white tracking-tight">{problemMeta.title || "Interview Problem"}</h1>
                </div>
                
                <div className="space-y-4 text-neutral-300 prose prose-invert prose-sm max-w-none">
                  {(problemMeta.description || "No problem active. Please exit and load a problem.").split("\n\n").map((para, i) => (
                    <p key={i} className="leading-relaxed">{para}</p>
                  ))}
                </div>

                {problemMeta.examples && problemMeta.examples.length > 0 && (
                  <div className="space-y-4 pt-4 border-t border-[#3a3a3a]">
                    <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-widest">Examples</h3>
                    <div className="space-y-3">
                      {problemMeta.examples.map((ex, i) => (
                        <div key={i} className="rounded-xl bg-[#2a2a2a] border border-[#3a3a3a] p-4 flex flex-col gap-2">
                          <div className="flex flex-col gap-1">
                            <span className="text-[10px] font-bold text-neutral-500 uppercase">Input</span>
                            <code className="text-sm font-mono text-neutral-300 bg-[#1a1a1a] px-2 py-1 rounded border border-[#3a3a3a]">{ex.input}</code>
                          </div>
                          <div className="flex flex-col gap-1">
                            <span className="text-[10px] font-bold text-neutral-500 uppercase">Output</span>
                            <code className="text-sm font-mono text-emerald-400 bg-[#1a1a1a] px-2 py-1 rounded border border-[#3a3a3a]">{ex.output}</code>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {problemMeta.constraints && problemMeta.constraints.length > 0 && (
                  <div className="space-y-3 pt-4 border-t border-[#3a3a3a]">
                    <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-widest">Constraints</h3>
                    <ul className="list-disc list-inside space-y-1 text-sm text-neutral-400">
                      {problemMeta.constraints.map((c, i) => (
                        <li key={i}>{c}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </Panel>

              <Separator className="h-1 bg-white/5 transition-colors hover:bg-slate-700 cursor-row-resize shrink-0" />

              {/* Code Editor */}
              <Panel defaultSize={60} minSize={30} className="flex flex-col bg-[#0F172A]">
                <div className="flex items-center justify-between px-4 py-2 border-b border-[#3a3a3a] bg-[#252526]">
                  <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Workspace</span>
                  <select
                    value={language}
                    onChange={(e) => {
                      const newLang = e.target.value as EditorLanguage;
                      setLanguage(newLang);
                      setCode(defaultCode[newLang] || "");
                    }}
                    className="bg-[#2a2a2a] border border-[#4a4a4a] text-neutral-300 text-xs rounded px-2 py-1 outline-none"
                  >
                    <option value="python">Python</option>
                    <option value="python3">Python 3</option>
                    <option value="javascript">JavaScript</option>
                    <option value="typescript">TypeScript</option>
                    <option value="java">Java</option>
                    <option value="c">C</option>
                    <option value="cpp">C++</option>
                    <option value="csharp">C#</option>
                  </select>
                </div>
                <div className="flex-1 overflow-hidden p-4">
                  <CodeEditor
                    value={code}
                    onChange={setCode}
                    language={language}
                    height="100%"
                  />
                </div>
              </Panel>
            </Group>
          </Panel>

          <Separator className="w-1 bg-white/5 transition-colors hover:bg-slate-700 cursor-col-resize shrink-0" />

          {/* RIGHT: AI Interviewer Chat */}
          <Panel defaultSize={35} minSize={25} className="bg-[#0F172A]">
            <InterviewChat 
              problem={problemMeta.description}
              code={code}
              language={language}
              isProblemLoaded={isProblemLoaded}
              difficulty={difficulty}
            />
          </Panel>
        </Group>
      </div>
      
      {/* End Interview overlay */}
      {isEnded && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#0B0F14]/90 backdrop-blur-sm">
           <div className="w-full max-w-md p-8 rounded-2xl bg-[#0F172A] border border-[#4a4a4a] shadow-2xl text-center space-y-6">
             <div className="w-16 h-16 bg-amber-500/20 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-4">
               <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22A10 10 0 0 0 12 2a10 10 0 0 0 0 20Z"/><path d="M12 6v6l4 2"/></svg>
             </div>
             <h2 className="text-2xl font-bold text-white tracking-tight">Time's Up!</h2>
             <p className="text-neutral-400 text-sm">The interview session has ended. Lucy will provide her final evaluation in the chat.</p>
             <button onClick={onExit} className="mt-4 w-full rounded-xl bg-slate-800 border border-[#4a4a4a] px-4 py-3 text-sm font-bold text-white hover:bg-slate-700 transition-colors">
               Return to Dashboard
             </button>
           </div>
        </div>
      )}
    </div>
  );
}
