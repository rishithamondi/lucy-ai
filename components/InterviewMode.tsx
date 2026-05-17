"use client";

import { useState, useEffect } from "react";
import { Panel, Group, Separator } from "react-resizable-panels";
import CodeEditor, { type EditorLanguage } from "@/components/CodeEditor";
import InterviewChat from "@/components/InterviewChat";
import { defaultCode } from "@/components/CodeEditor";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { UI_TOKENS } from "@/lib/theme";

import type { InterviewPhase, InterviewMessage, InterviewEvaluation, InterviewEvidence } from "@/types/interview";

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
  
  // New props from useInterview
  sessionId: string | null;
  phase: InterviewPhase;
  messages: InterviewMessage[];
  isLoading: boolean;
  timeLeft: number;
  onStart: (diff: string, personality: string) => void;
  onSendMessage: (msg: string, currentCode?: string) => void;
  onSubmitCode: () => void;
  onEnd: () => void;
  evaluation: string | null;
  evaluationState: InterviewEvaluation | null;
  evidence: InterviewEvidence | null;
  isExpired: boolean;
  showReport: boolean;
}

export default function InterviewMode({
  problemMeta,
  code,
  setCode,
  language,
  setLanguage,
  onExit,
  isProblemLoaded,
  sessionId,
  phase,
  messages,
  isLoading,
  timeLeft,
  onStart,
  onSendMessage,
  onSubmitCode,
  onEnd,
  evaluation,
  evaluationState,
  evidence,
  isExpired,
  showReport,
}: InterviewModeProps) {
  const [showSetup, setShowSetup] = useState(true);
  const [selectedPersonality, setSelectedPersonality] = useState("neutral");

  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds < 0) return "00:00";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStartInterview = (selectedDiff: string) => {
    if (onStart) {
      onStart(selectedDiff, selectedPersonality);
      setShowSetup(false);
    }
  };

  // Difficulty Selector Overlay
  if (showSetup) {
    return (
      <div className={`fixed inset-0 z-50 flex flex-col items-center justify-center ${UI_TOKENS.background.main} text-white`}>
        <div className={`w-full max-w-lg p-8 rounded-2xl ${UI_TOKENS.background.panel} border ${UI_TOKENS.border.primary} shadow-2xl text-center space-y-8`}>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-tight">Interview Setup</h2>
            <p className={`${UI_TOKENS.text.muted} text-sm`}>Configure your AI interviewer personality and difficulty.</p>
          </div>

          <div className="space-y-4">
            <div className="text-left">
              <span className={`text-[10px] font-bold ${UI_TOKENS.text.muted} uppercase tracking-widest block mb-2`}>Interviewer Personality</span>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "supportive", label: "Supportive" },
                  { id: "neutral", label: "Professional" },
                  { id: "strict", label: "FAANG Strict" },
                  { id: "rapid-fire", label: "Rapid Fire" },
                  { id: "mentor", label: "Lead Mentor" }
                ].map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPersonality(p.id)}
                    className={`px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                      selectedPersonality === p.id 
                        ? `${UI_TOKENS.accent.emeraldBg} border ${UI_TOKENS.accent.emeraldBorder} ${UI_TOKENS.accent.emerald}`
                        : `${UI_TOKENS.button.secondary}`
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="text-left">
              <span className={`text-[10px] font-bold ${UI_TOKENS.text.muted} uppercase tracking-widest block mb-2`}>Select Difficulty</span>
              <div className="grid grid-cols-2 gap-3">
                {["Beginner", "Intermediate", "Advanced", "FAANG level"].map((diff) => (
                  <button
                    key={diff}
                    onClick={() => handleStartInterview(diff)}
                    className={`w-full rounded-xl py-3 text-sm font-bold ${UI_TOKENS.button.secondary}`}
                  >
                    {diff}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button onClick={onExit} className="text-sm font-semibold text-neutral-500 hover:text-neutral-300 transition-colors">
            Cancel and Return
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`fixed inset-0 z-50 flex flex-col ${UI_TOKENS.background.main} text-white`}>
      {/* Header */}
      <header className={`flex shrink-0 items-center justify-between border-b ${UI_TOKENS.border.secondary} ${UI_TOKENS.background.card} px-6 py-3`}>
        <div className="flex items-center gap-4">
          <img src="/lucy.png" alt="Lucy AI Logo" className="w-6 h-6 object-contain" />
          <h1 className="text-lg font-bold tracking-tight">Lucy AI</h1>
          <div className="h-4 w-px bg-white/10" />
          <div className="flex items-center gap-2">
            <span className={`flex h-2 w-2 rounded-full bg-emerald-500 ${UI_TOKENS.accent.emeraldGlow} animate-pulse`} />
            <span className={`text-xs font-bold uppercase tracking-widest ${UI_TOKENS.accent.emerald}`}>Interview Mode</span>
            <span className={`rounded bg-white/5 px-2 py-0.5 text-[10px] font-bold uppercase ${UI_TOKENS.text.muted} border ${UI_TOKENS.border.secondary}`}>
              {phase === "introduction" ? "Intro" : 
               phase === "discussion" ? "Plan" :
               phase === "coding" ? "Code" :
               phase === "review" ? "Review" : "Eval"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-6">
          {/* Submit Button */}
          {phase === "coding" && (
            <button
              onClick={onSubmitCode}
              disabled={isLoading}
              className={`flex items-center justify-center h-[28px] rounded-md px-4 text-xs font-bold disabled:opacity-50 ${UI_TOKENS.button.primary}`}
            >
              {isLoading ? "Submitting..." : "Submit Code"}
            </button>
          )}

          {/* Timer */}
          <div className="flex items-center gap-2 bg-[#2a2a2a] border border-[#3a3a3a] rounded-lg px-3 py-1.5">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={timeLeft < 300 ? "#ef4444" : "#94a3b8"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            <span className={`text-sm font-mono font-bold ${timeLeft < 300 ? "text-red-400" : "text-neutral-300"}`}>
              {formatTime(timeLeft)}
            </span>
          </div>

          <button
            onClick={onEnd}
            disabled={isLoading}
            className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-1.5 text-xs font-bold text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-colors disabled:opacity-50"
          >
            End Interview
          </button>
        </div>
      </header>

      {/* Main Split Layout */}
      <div className="min-h-0 flex-1 overflow-hidden">
        <Group orientation="horizontal">
          {/* LEFT: Problem & Editor */}
          <Panel defaultSize={65} minSize={40} className={`flex flex-col ${UI_TOKENS.background.main}`}>
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

              <Separator className="h-1 bg-transparent transition-colors hover:bg-neutral-700 cursor-row-resize shrink-0 mx-2" />

              {/* Code Editor */}
              <Panel defaultSize={60} minSize={30} className={`flex flex-col ${UI_TOKENS.background.panel} rounded-xl border ${UI_TOKENS.border.primary} m-2 mt-0 overflow-hidden`}>
                <div className={`flex items-center justify-between px-4 py-2 border-b ${UI_TOKENS.border.secondary} ${UI_TOKENS.background.card}`}>
                  <span className={`text-[10px] font-bold ${UI_TOKENS.text.muted} uppercase tracking-widest`}>Workspace</span>
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
          <Panel defaultSize={35} minSize={25} className={UI_TOKENS.background.panel}>
            <InterviewChat 
              messages={messages}
              onSendMessage={(msg) => onSendMessage(msg, code)}
              isLoading={isLoading}
            />
          </Panel>
        </Group>
      </div>
      
      {/* End Interview / Evaluation overlay */}
      {(sessionId && (timeLeft === 0 || showReport || (isLoading && phase === "evaluation"))) && (
        <div className={`absolute inset-0 z-50 flex items-center justify-center ${UI_TOKENS.background.overlay}`}>
           <div className={`w-full max-w-3xl p-10 rounded-2xl ${UI_TOKENS.background.panel} border ${UI_TOKENS.border.primary} shadow-2xl text-center space-y-6 max-h-[85vh] overflow-y-auto custom-scrollbar`}>
             <div className={`w-16 h-16 ${UI_TOKENS.accent.emeraldBg} ${UI_TOKENS.accent.emerald} rounded-full flex items-center justify-center mx-auto mb-4`}>
               {isLoading ? (
                 <div className="h-8 w-8 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
               ) : (
                 <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22A10 10 0 0 0 12 2a10 10 0 0 0 0 20Z"/><path d="M12 6v6l4 2"/></svg>
               )}
             </div>
             
             <h2 className="text-2xl font-bold text-white tracking-tight">
               {isLoading ? "Generating Report..." : (timeLeft === 0 ? "Time's Up!" : "Interview Evaluation")}
             </h2>
             
             {isLoading ? (
               <div className="space-y-4">
                 <p className="text-neutral-400 text-sm">Lucy is analyzing your performance and preparing your final interview report. This usually takes a few seconds...</p>
                 <div className="flex justify-center gap-1">
                   {[0, 1, 2].map((i) => (
                     <div key={i} className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.1}s` }} />
                   ))}
                 </div>
               </div>
             ) : (
               <>
                 {evaluationState && (
                   <div className="grid grid-cols-2 gap-4 mb-6">
                     {Object.entries(evaluationState.scores).map(([category, score]) => (
                       <div key={category} className="bg-[#1a1a1a] border border-[#3a3a3a] rounded-xl p-3 text-left">
                         <div className="flex justify-between items-center mb-2">
                           <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-tighter">{category.replace(/([A-Z])/g, ' $1')}</span>
                           <span className={`text-xs font-mono font-bold ${score >= 7 ? 'text-emerald-400' : score >= 4 ? 'text-amber-400' : 'text-red-400'}`}>{score}/10</span>
                         </div>
                         <div className="w-full bg-[#2a2a2a] h-1 rounded-full overflow-hidden">
                           <div 
                             className={`h-full transition-all duration-500 ${score >= 7 ? 'bg-emerald-500' : score >= 4 ? 'bg-amber-500' : 'bg-red-500'}`}
                             style={{ width: `${(score / 10) * 100}%` }}
                           />
                         </div>
                       </div>
                     ))}
                   </div>
                 )}

                 {/* Execution Summary Dashboard */}
                 {evaluationState && evidence && (
                    <div className="mb-6 bg-[#1a1a1a] border border-[#3a3a3a] rounded-xl p-4 text-left">
                       <h3 className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-3">Execution Summary</h3>
                       <div className="grid grid-cols-3 gap-4">
                          <div className="flex flex-col">
                             <span className="text-[10px] text-neutral-500 uppercase">Pass Rate</span>
                             <span className="text-sm font-bold text-emerald-400">
                                {evidence?.totalTestCases > 0 
                                  ? `${Math.round((evidence.passedTestCases / evidence.totalTestCases) * 100)}%` 
                                  : "0%"}
                             </span>
                          </div>
                          <div className="flex flex-col">
                             <span className="text-[10px] text-neutral-500 uppercase">Submissions</span>
                             <span className="text-sm font-bold text-white">{evidence?.submissionCount || 0}</span>
                          </div>
                          <div className="flex flex-col">
                             <span className="text-[10px] text-neutral-500 uppercase">Failures</span>
                             <span className="text-sm font-bold text-red-400">
                                {(evidence?.compilationFailures || 0) + (evidence?.runtimeFailures || 0)}
                             </span>
                          </div>
                       </div>
                    </div>
                 )}

                 {evaluation ? (
                   <div className="text-left bg-slate-900/50 rounded-xl p-6 border border-[#3a3a3a] prose prose-invert prose-sm max-w-none">
                     <ReactMarkdown remarkPlugins={[remarkGfm]}>
                       {evaluation}
                     </ReactMarkdown>
                   </div>
                 ) : (
                   <p className="text-neutral-400 text-sm">The interview session has ended. Lucy is providing her final evaluation.</p>
                 )}
               </>
             )}

             {!isLoading && (
               <button onClick={onExit} className={`mt-4 w-full rounded-xl px-4 py-3 text-sm font-bold ${UI_TOKENS.button.secondary}`}>
                 Return to Dashboard
               </button>
             )}
           </div>
        </div>
      )}

      {/* Session Expired Overlay */}
      {isExpired && (
        <div className={`absolute inset-0 z-[60] flex items-center justify-center ${UI_TOKENS.background.overlay}`}>
           <div className={`w-full max-w-md p-8 rounded-2xl ${UI_TOKENS.background.panel} border border-red-500/20 shadow-2xl text-center space-y-6`}>
             <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
               <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
             </div>
             <h2 className="text-2xl font-bold text-white tracking-tight">Session Expired</h2>
             <p className="text-neutral-400 text-sm">Your interview session has timed out or was reset due to a server update. Please restart the session to continue.</p>
             <div className="flex flex-col gap-3">
               <button 
                 onClick={() => {
                   setShowSetup(true); // Back to difficulty selection
                   // The hook handles clearing internal sessionId on startInterview
                 }} 
                 className={`w-full rounded-xl px-4 py-3 text-sm font-bold ${UI_TOKENS.button.primary}`}
               >
                 Restart Interview
               </button>
               <button onClick={onExit} className={`text-sm font-semibold ${UI_TOKENS.button.ghost}`}>
                 Exit to Dashboard
               </button>
             </div>
           </div>
        </div>
      )}
    </div>
  );
}
