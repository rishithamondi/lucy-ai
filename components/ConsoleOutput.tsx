"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { motion, AnimatePresence } from "framer-motion";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import LearningPanelContainer from "./LearningPanelContainer";

export type TestResult = {
  id: number;
  status: "pass" | "fail" | "pending";
  message?: string;
  output?: string;
  input?: string;
  expectedOutput?: string;
  actualOutput?: string;
};

export type FlowchartData = {
  mermaid: string;
  explanation: string;
};

interface ConsoleOutputProps {
  consoleOutput?: string;
  aiFeedback?: string;
  edgeCases?: string;
  detectedComplexity?: string;
  showComplexityGraph?: boolean;
  testResults?: TestResult[];
  isRunning?: boolean;
  problemDescription?: string;
  userCode?: string;
  onExplanationUpdate?: (resultId: number, explanation: string) => void;
  onGenerateEdgeCases?: () => void;
  isGeneratingEdgeCases?: boolean;
  flowchartData?: FlowchartData | null;
  onGenerateFlowchart?: () => void;
  isGeneratingFlowchart?: boolean;
  activeTab: "console" | "ai" | "edges";
  onActiveTabChange: (tab: "console" | "ai" | "edges") => void;
  isAnalyzing?: boolean;
  isDebugging?: boolean;
  isHinting?: boolean;
  codeAnalysis?: {
    pattern: { name: string; confidence: number };
    complexity: { time: string; space: string };
    quality: { score: number; issues: string[] };
    wrongApproach?: { detected: boolean; issue?: string; suggestion?: string };
  } | null;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

const CenteredPanelContent = ({
  icon,
  title,
  description,
  button,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  button?: {
    label: string;
    onClick: () => void;
    disabled?: boolean;
    className?: string;
  };
}) => (
  <div className="h-full flex items-center justify-center animate-in fade-in duration-500">
    <div className="flex flex-col items-center text-center">
      {/* 1. Icon Container (Fixed 72x72) */}
      <div className="relative">
        <div className="relative h-[72px] w-[72px] rounded-[16px] bg-slate-800/20 flex items-center justify-center border border-[#3a3a3a]">
          {React.isValidElement(icon) 
            ? React.cloneElement(icon as React.ReactElement, { width: 28, height: 28, strokeWidth: 1.5 })
            : icon}
        </div>
      </div>

      {/* 2. Spacing (Fixed 18px) */}
      <div className="h-[18px]" />

      {/* 3. Title Slot (Fixed Height for stability) */}
      <div className="h-[28px] flex items-center justify-center">
        <h3 className="text-[20px] font-semibold text-white tracking-tight">
          {title}
        </h3>
      </div>

      {/* 4. Spacing (Fixed 10px) */}
      <div className="h-[10px]" />

      {/* 5. Description Slot (Fixed Height to absorb line wrapping) */}
      <div className="h-[68px] max-w-[420px] flex items-center justify-center px-4">
        <p className="text-[14px] text-neutral-400 leading-[1.6] opacity-80">
          {description}
        </p>
      </div>

      {/* 6. Spacing (Fixed 22px) */}
      <div className="h-[22px]" />

      {/* 7. Action Button Slot (Fixed Height to prevent layout shift) */}
      <div className="h-[44px] flex items-center justify-center">
        {button && (
          <button
            type="button"
            onClick={button.onClick}
            disabled={button.disabled}
            className={`px-6 py-2 rounded-lg text-sm font-medium transition-colors border border-[#3a3a3a] bg-[#333333] text-[#c9d1d9] hover:bg-[#404040] active:scale-95 ${button.className}`}
          >
            {button.label}
          </button>
        )}
      </div>
    </div>
  </div>
);

const PanelCardLayout = ({
  icon,
  title,
  description,
  button,
  children
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  button?: {
    label: string;
    onClick: () => void;
    disabled?: boolean;
    className?: string;
  };
  children?: React.ReactNode;
}) => (
  <LearningPanelContainer>
    <div className="min-h-0 flex-1 overflow-hidden rounded-xl border border-[#3a3a3a] bg-[#252526] flex flex-col relative h-full">
      {children ? (
        children
      ) : (
        <CenteredPanelContent
          icon={icon}
          title={title}
          description={description}
          button={button}
        />
      )}
    </div>
  </LearningPanelContainer>
);

export default function ConsoleOutput({
  consoleOutput = "",
  aiFeedback = "",
  edgeCases = "",
  testResults = [],
  isRunning = false,
  problemDescription = "",
  userCode = "",
  detectedComplexity,
  showComplexityGraph = false,
  onExplanationUpdate,
  onGenerateEdgeCases,
  isGeneratingEdgeCases = false,
  flowchartData = null,
  onGenerateFlowchart,
  isGeneratingFlowchart = false,
  activeTab,
  onActiveTabChange,
  isAnalyzing = false,
  isDebugging = false,
  isHinting = false,
  codeAnalysis = null,
  isExpanded = false,
  onToggleExpand,
}: ConsoleOutputProps) {
  const [explanations, setExplanations] = useState<Record<number, string>>({});
  const [loadingIds, setLoadingIds] = useState<Set<number>>(new Set());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const mermaidRef = useRef<HTMLDivElement>(null);
  const fullscreenMermaidRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isFullscreen && flowchartData?.mermaid) {
      import("mermaid").then((mermaidModule) => {
        const mermaid = mermaidModule.default;
        mermaid.initialize({
          startOnLoad: false,
          theme: "dark",
          securityLevel: "loose",
          flowchart: {
            nodeSpacing: 100,
            rankSpacing: 100,
          }
        });

        mermaid.render("flowchart-svg-diagram", flowchartData.mermaid).then((result) => {
          if (mermaidRef.current) {
            mermaidRef.current.innerHTML = result.svg;
          }
          if (fullscreenMermaidRef.current) {
            fullscreenMermaidRef.current.innerHTML = result.svg;
          }
        }).catch((e) => {
          console.error(e);
          const errorHtml = `<div class="text-red-400 p-4 font-sans max-w-full overflow-hidden text-sm">Flowchart could not be generated for this algorithm.<br/><br/>Error: ${e.message}</div>`;
          if (mermaidRef.current) {
            mermaidRef.current.innerHTML = errorHtml;
          }
          if (fullscreenMermaidRef.current) {
            fullscreenMermaidRef.current.innerHTML = errorHtml;
          }
        });
      });
    }
  }, [flowchartData, isFullscreen]);

  const chartData = useMemo(() => {
    const ns = [10, 50, 100, 500, 1000];
    return ns.map((n) => ({
      n,
      "O(1)": 1,
      "O(log n)": Math.round(Math.log2(n)),
      "O(n)": n,
      "O(n log n)": Math.round(n * Math.log2(n)),
      "O(n^2)": n * n,
    }));
  }, []);



  const handleExplainError = async (result: TestResult) => {
    if (result.status !== "fail" || !result.input || result.expectedOutput == null || result.actualOutput == null) return;

    setLoadingIds((prev) => new Set(prev).add(result.id));

    try {
      const res = await fetch("/api/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          problemDescription,
          userCode,
          testInput: result.input,
          expectedOutput: result.expectedOutput,
          actualOutput: result.actualOutput,
        }),
      });

      const data = await res.json();
      const explanation = data.explanation || data.error || "Could not get explanation.";
      setExplanations((prev) => ({ ...prev, [result.id]: explanation }));
      onExplanationUpdate?.(result.id, explanation);
    } catch (err) {
      const msg = "Failed to fetch explanation.";
      setExplanations((prev) => ({ ...prev, [result.id]: msg }));
      onExplanationUpdate?.(result.id, msg);
    } finally {
      setLoadingIds((prev) => {
        const next = new Set(prev);
        next.delete(result.id);
        return next;
      });
    }
  };

  const renderComplexityGraph = () => {
    if (!showComplexityGraph || !chartData) return null;

    const dataKeys = ["O(1)", "O(log n)", "O(n)", "O(n log n)", "O(n^2)"];
    const colors: Record<string, string> = {
      "O(1)": "#a855f7",
      "O(log n)": "#06b6d4",
      "O(n)": "#10b981",
      "O(n log n)": "#f59e0b",
      "O(n^2)": "#ef4444",
    };

    return (
      <div className="bg-[#252526] border border-[#3a3a3a] rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex flex-col">
            <h4 className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-1">Algorithmic Efficiency</h4>
            <span className="text-xs text-neutral-400">Growth rate comparison</span>
          </div>
          <div className="flex items-center gap-4">
            {dataKeys.map((key) => (
              <div key={key} className="flex items-center gap-1.5">
                <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: colors[key] }} />
                <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-tighter">{key}</span>
              </div>
            ))}
          </div>
        </div>
        
        <div className="h-[220px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
              <XAxis 
                dataKey="n" 
                stroke="#64748b" 
                fontSize={10} 
                tickLine={false} 
                axisLine={false}
                tick={{ fill: '#64748b' }}
                label={{ value: 'Input Size (n)', position: 'insideBottom', offset: -5, fill: '#64748b', fontSize: 10 }}
              />
              <YAxis 
                stroke="#64748b" 
                fontSize={10} 
                tickLine={false} 
                axisLine={false}
                tick={{ fill: '#64748b' }}
                label={{ value: 'Operations', angle: -90, position: 'insideLeft', offset: 0, fill: '#64748b', fontSize: 10 }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#0d1117', 
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '12px',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  boxShadow: '0 10px 15px -3px rgba(0,0,0,0.5)'
                }}
                itemStyle={{ padding: '2px 0' }}
              />
              {dataKeys.map((key) => {
                const isSelected = detectedComplexity === key;
                return (
                  <Line
                    key={key}
                    type="monotone"
                    dataKey={key}
                    stroke={colors[key]}
                    strokeWidth={isSelected ? 2 : 1}
                    dot={false}
                    opacity={isSelected ? 1 : 0.2}
                    animationDuration={1500}
                  />
                );
              })}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  };

  const renderCodeAnalysisReport = () => {
    if (!codeAnalysis) return null;

    return (
      <div className="mt-8 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="flex items-center gap-2 px-1">
          <div className="h-4 w-1 rounded-full bg-[#30363d]" />
          <h3 className="text-xs font-bold tracking-widest text-neutral-500 uppercase">Code Intelligence</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Pattern & Score */}
          <div className="space-y-4">
            <div className="bg-[#2a2a2a] border border-[#3a3a3a] rounded-xl p-5 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:opacity-10 transition-opacity">
                 <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v8"/><path d="m4.93 4.93 5.66 5.66"/><path d="M2 12h8"/><path d="m4.93 19.07 5.66-5.66"/><path d="M12 22v-8"/><path d="m19.07 19.07-5.66-5.66"/><path d="M22 12h-8"/><path d="m19.07 4.93-5.66 5.66"/></svg>
              </div>
              <div className="relative z-10">
                <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-tighter mb-1">Detected Pattern</p>
                <div className="flex items-baseline gap-2">
                  <h4 className="text-xl font-bold text-white">{codeAnalysis.pattern.name}</h4>
                  <span className="text-[10px] font-bold text-neutral-400">{(codeAnalysis.pattern.confidence * 100).toFixed(0)}% Conf.</span>
                </div>
              </div>
            </div>

            <div className="bg-[#2a2a2a] border border-[#3a3a3a] rounded-xl p-5">
              <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-tighter mb-4">Complexity Analysis</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-[10px] text-neutral-400">Time</p>
                  <p className="text-lg font-mono font-bold text-slate-200">{codeAnalysis.complexity.time}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] text-neutral-400">Space</p>
                  <p className="text-lg font-mono font-bold text-slate-200">{codeAnalysis.complexity.space}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Quality & Issues */}
          <div className="bg-[#2a2a2a] border border-[#3a3a3a] rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-tighter">Quality Score</p>
              <div className="flex items-baseline gap-0.5">
                <span className="text-2xl font-bold text-white">{codeAnalysis.quality.score}</span>
                <span className="text-xs font-bold text-neutral-500">/10</span>
              </div>
            </div>
            
            <div className="space-y-3">
              <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-tighter">Potential Issues</p>
              <ul className="space-y-2">
                {codeAnalysis.quality.issues.map((issue: string, i: number) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-neutral-300">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-slate-600" />
                    {issue}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Wrong Approach Detector */}
        {codeAnalysis.wrongApproach?.detected && (
          <div className="bg-[#2a2a2a] border border-red-500/10 rounded-xl p-5 space-y-3">
             <div className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                <h4 className="text-xs font-bold text-red-400 uppercase tracking-wider">Suboptimal Approach</h4>
             </div>
             <p className="text-sm text-neutral-300 leading-relaxed">
               {codeAnalysis.wrongApproach.issue}
             </p>
             <div className="bg-[#252526] rounded-xl p-4 border border-[#3a3a3a] mt-2">
                <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-tighter mb-1">Recommendation</p>
                <p className="text-xs text-neutral-300 leading-relaxed">{codeAnalysis.wrongApproach.suggestion}</p>
             </div>
          </div>
        )}
      </div>
    );
  };

  const renderConsoleTab = () => {
    return (
      <PanelCardLayout
        icon={<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>}
        title="Console Output"
        description="Run your code to see execution output and test results here."
      >
        {(testResults.length > 0 || consoleOutput) ? (
          <div className="p-5 space-y-4 overflow-y-auto h-full">
            {testResults.map((result) => (
              <div
                key={result.id}
                className="bg-[#2a2a2a] border border-[#3a3a3a] rounded-xl p-5 hover:bg-[#333333] transition-colors"
              >
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-300">
                    Test Case {result.id}
                  </span>
                  <span
                    className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
                      result.status === "pass"
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        : result.status === "fail"
                          ? "bg-red-500/10 text-red-400 border border-red-500/20"
                          : "bg-slate-500/10 text-neutral-400 border border-slate-500/20"
                    }`}
                  >
                    {result.status === "pass" ? "Passed" : result.status === "fail" ? "Failed" : "Pending"}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-[10px] uppercase tracking-tighter text-neutral-500 font-bold">Input</p>
                    <pre className="text-xs font-mono text-neutral-300 bg-black/20 p-2 rounded border border-[#3a3a3a] overflow-x-auto">
                      {result.input}
                    </pre>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] uppercase tracking-tighter text-neutral-500 font-bold">Output</p>
                    <pre className="text-xs font-mono text-neutral-300 bg-black/20 p-2 rounded border border-[#3a3a3a] overflow-x-auto">
                      {result.actualOutput || result.output}
                    </pre>
                  </div>
                </div>

                {result.status === "fail" && (
                  <div className="mt-4 border-t border-slate-700/30 pt-4">
                    <div className="flex items-center justify-between mb-2">
                       <p className="text-[10px] font-black text-cyan-400 uppercase tracking-widest">AI Explanation</p>
                       <button
                         onClick={() => handleExplainError(result)}
                         disabled={loadingIds.has(result.id)}
                         className="text-[10px] font-bold text-amber-500 hover:text-amber-400 transition-colors uppercase tracking-widest disabled:opacity-50"
                       >
                         {loadingIds.has(result.id) ? "Loading..." : "Regenerate Hint"}
                       </button>
                    </div>
                    <div className="bg-cyan-500/5 rounded-xl p-4 border border-cyan-500/10 text-xs text-neutral-300 leading-relaxed font-medium italic shadow-inner">
                      {explanations[result.id] || "No explanation available. Click 'Explain Error' to generate insights."}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {consoleOutput && (
              <div className="bg-[#2a2a2a] border border-[#3a3a3a] rounded-xl p-5 shadow-xl">
                 <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-tighter mb-3">Execution Logs</p>
                 <pre className="text-xs font-mono text-neutral-300 bg-black/40 p-4 rounded-lg border border-[#3a3a3a] overflow-x-auto whitespace-pre-wrap leading-relaxed shadow-inner">
                   {consoleOutput}
                 </pre>
              </div>
            )}
            
            {renderCodeAnalysisReport()}
          </div>
        ) : isRunning ? (
          <CenteredPanelContent
            icon={
              <div className="relative h-7 w-7">
                <div className="absolute inset-0 rounded-full border-2 border-slate-500/10" />
                <div className="absolute inset-0 rounded-full border-2 border-t-slate-500 animate-spin" />
              </div>
            }
            title="Executing Code"
            description="Processing your solution and running test cases against our validation engine..."
          />
        ) : undefined}
      </PanelCardLayout>
    );
  };

  const renderAiFeedbackTab = () => {
    const lower = detectedComplexity?.toLowerCase() ?? "";
    const isO1 = lower.includes("o(1)") || lower.includes("constant");
    const isLogN = lower.includes("log n") && !lower.includes("n log n");
    const isN = lower === "o(n)" || (lower.includes("o(n)") && !lower.includes("n log n") && !lower.includes("n^2"));
    const isNLogN = lower.includes("n log n");
    const isN2 = lower.includes("n^2") || lower.includes("n2") || lower.includes("n^ 2");

    let detectedName = "Unknown";
    let explanationText = "";
    if (isO1) {
      detectedName = "O(1)";
      explanationText = "This means runtime remains constant regardless of the input size.";
    } else if (isLogN) {
      detectedName = "O(log n)";
      explanationText = "This means runtime increases logarithmically—extremely efficient for large inputs.";
    } else if (isN) {
      detectedName = "O(n)";
      explanationText = "This means runtime increases linearly with input size.";
    } else if (isNLogN) {
      detectedName = "O(n log n)";
      explanationText = "This means runtime is slightly worse than linear, typical for efficient sorting algorithms.";
    } else if (isN2) {
      detectedName = "O(n²)";
      explanationText = "This means runtime grows quadratically, becoming very slow for large inputs.";
    }

    const sections = aiFeedback ? aiFeedback.split(/(?=(?:^|\n)##+ )/).filter((s: string) => s.trim().length > 0) : [];
    
    // Detect report type from the first section header
    let reportTitle = "AI Feedback";
    let reportIcon = <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>;
    
    const filteredSections = sections.filter(section => {
      const trimmed = section.trim();
      if (trimmed.startsWith("## Analyze Report")) {
        reportTitle = "Analyze Report";
        reportIcon = <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="8"/></svg>;
        return false;
      }
      if (trimmed.startsWith("## Debug Report")) {
        reportTitle = "Debug Report";
        reportIcon = <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.7-3.7a1 1 0 0 0 0-1.4l-1.6-1.6a1 1 0 0 0-1.4 0l-3.7 3.7Z"/><path d="m2 22 5-5"/><path d="M9.5 14.5 16 8"/><path d="m14 2 8 8"/><path d="m2 14 8 8"/></svg>;
        return false;
      }
      if (trimmed.startsWith("## AI Hint")) {
        reportTitle = "AI Hint";
        reportIcon = <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></svg>;
        return false;
      }
      return true;
    });

    const panelDescription = 
      reportTitle === "Debug Report" ? "Runtime execution trace and behavior analysis." :
      reportTitle === "Analyze Report" ? "High-level code review: logic, edge cases, and complexity." :
      reportTitle === "AI Hint" ? "A targeted nudge to help you move forward." :
      "AI-generated insights about your solution.";

    return (
      <PanelCardLayout
        icon={reportIcon}
        title={reportTitle}
        description={panelDescription}
      >
        {isAnalyzing || isDebugging || isHinting ? (
          <CenteredPanelContent
            icon={
              <div className="relative h-10 w-10 flex items-center justify-center">
                <div className={`absolute inset-0 rounded-xl border-2 ${
                  isDebugging ? 'border-violet-500/20' : isHinting ? 'border-amber-500/20' : 'border-slate-500/20'
                }`} />
                <div className={`absolute inset-0 rounded-xl border-2 ${
                  isDebugging ? 'border-t-violet-500' : isHinting ? 'border-t-amber-400' : 'border-t-slate-300'
                } animate-spin`} />
                {isDebugging ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-violet-400"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.7-3.7a1 1 0 0 0 0-1.4l-1.6-1.6a1 1 0 0 0-1.4 0l-3.7 3.7Z"/><path d="m2 22 5-5"/><path d="M9.5 14.5 16 8"/><path d="m14 2 8 8"/><path d="m2 14 8 8"/></svg>
                ) : isHinting ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-400"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-neutral-300"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="8"/></svg>
                )}
              </div>
            }
            title={isDebugging ? "AI is Debugging" : isHinting ? "AI is Hinting" : "AI is Analyzing"}
            description={
              isDebugging ? "Simulating execution flow and tracking variable states..." :
              isHinting ? "Crafting a targeted nudge based on your current approach..." :
              "Reviewing logic, complexity, and approach for potential improvements..."
            }
          />
        ) : aiFeedback ? (
          <div className="p-5 space-y-6 overflow-y-auto h-full scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
            {/* Complexity Badge if available */}
            {detectedComplexity && reportTitle !== "Debug Report" && (
              <div className="flex items-center gap-3 animate-in slide-in-from-left-4 duration-500">
                <div className={`px-4 py-2 rounded-xl border font-mono font-bold text-sm shadow-xl transition-all duration-500 ${
                  isO1 ? "bg-purple-500/10 text-purple-400 border-purple-500/30 shadow-purple-500/10" :
                  isLogN ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/30 shadow-cyan-500/10" :
                  isN ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-emerald-500/10" :
                  isNLogN ? "bg-amber-500/10 text-amber-400 border-amber-500/30 shadow-amber-500/10" :
                  isN2 ? "bg-red-500/10 text-red-400 border-red-500/30 shadow-red-500/10" :
                  "bg-slate-500/10 text-neutral-400 border-slate-500/30 shadow-slate-500/10"
                }`}>
                  {detectedComplexity}
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">Detected Complexity</span>
                  <span className="text-xs text-neutral-300 font-medium">{explanationText}</span>
                </div>
              </div>
            )}

            {/* AI Report Sections */}
            {filteredSections.map((section: string, idx: number) => {
              const [titleLine, ...contentLines] = section.trim().split("\n");
              const title = titleLine.replace(/^##+\s*/, "");
              const content = contentLines.join("\n").trim();
              
              return (
                <div key={idx} className="bg-[#2a2a2a] border border-[#3a3a3a] rounded-xl p-5 space-y-3 shadow-lg group transition-all hover:border-[#4a4a4a]">
                  <h4 className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest group-hover:text-neutral-300 transition-colors">{title}</h4>
                  <div className="text-sm text-neutral-300 leading-relaxed font-medium prose prose-invert prose-sm max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
                  </div>
                </div>
              );
            })}
          </div>
        ) : undefined}
      </PanelCardLayout>
    );
  };

  const renderEdgeCasesTab = () => {
    return (
      <PanelCardLayout
        icon={<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>}
        title="Edge Cases"
        description="Validate your algorithm against corner cases."
        button={onGenerateEdgeCases ? {
          label: isGeneratingEdgeCases ? "Generating..." : "Generate Edge Cases",
          onClick: onGenerateEdgeCases,
          disabled: isGeneratingEdgeCases,
          className: "bg-[#333333] border border-[#3a3a3a] text-[#c9d1d9] hover:bg-[#404040] hover:border-[#8b949e]"
        } : undefined}
      >
        {edgeCases ? (
          <div className="p-5 space-y-5 overflow-y-auto">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Edge Case Analysis</h3>
              <button
                type="button"
                onClick={onGenerateEdgeCases}
                disabled={!onGenerateEdgeCases || isGeneratingEdgeCases}
                className="text-[10px] font-bold text-amber-500 hover:text-amber-400 transition-colors uppercase tracking-widest disabled:opacity-50"
              >
                {isGeneratingEdgeCases ? "Regenerating..." : "Regenerate"}
              </button>
            </div>
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                ol: ({ node, ...props }: any) => <ol className="flex flex-col gap-5 list-decimal pl-5" {...props} />,
                ul: ({ node, ...props }: any) => <ul className="flex flex-col gap-5 list-disc pl-5" {...props} />,
                li: ({ node, ...props }: any) => (
                  <li className="bg-[#2a2a2a] border border-[#3a3a3a] rounded-xl p-6 mb-4 list-none transition-colors hover:bg-[#333333]" {...props} />
                ),
                strong: ({ node, children, ...props }) => (
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-4 w-1 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
                    <strong className="text-base font-bold text-white tracking-tight" {...props}>{children}</strong>
                  </div>
                ),
                pre: ({ node, ...props }) => (
                  <div className="relative group/code">
                    <div className="absolute -inset-2 bg-gradient-to-r from-amber-500/10 to-transparent rounded-lg opacity-0 group-hover/code:opacity-100 transition-opacity" />
                    <pre className="relative font-mono bg-black/40 p-4 rounded-lg text-xs overflow-x-auto text-neutral-300 shadow-inner border border-[#3a3a3a] leading-relaxed" {...props} />
                  </div>
                ),
                code: ({ node, inline, ...props }: any) => (
                  inline
                    ? <code className="bg-slate-800 text-cyan-300 px-1 py-0.5 rounded text-xs" {...props} />
                    : <code {...props} />
                ),
                p: ({ node, ...props }) => <p className="text-sm text-neutral-300 leading-relaxed font-medium" {...props} />,
              }}
            >
              {edgeCases}
            </ReactMarkdown>
          </div>
        ) : undefined}
      </PanelCardLayout>
    );
  };


  return (
    <div className="flex h-full flex-col bg-[#0a0a0a] text-gray-300 overflow-hidden">
      {/* Tabs */}
      <div 
        className="flex shrink-0 items-center justify-between border-b border-[#2a2a2a] bg-[#1e1e1e] px-2 h-[36px] cursor-pointer"
        onClick={onToggleExpand}
      >
        <div className="flex gap-6 h-full pl-2">
          {[
            { id: "console", label: "Console" },
            { id: "ai", label: "AI Feedback" },
            { id: "edges", label: "Edge Cases" }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={(e) => {
                e.stopPropagation(); // prevent panel toggle
                onActiveTabChange(tab.id as any);
                if (!isExpanded && onToggleExpand) {
                  onToggleExpand();
                }
              }}
              className={`relative h-full flex items-center text-[11px] font-bold tracking-wider uppercase transition-all ${
                activeTab === tab.id
                  ? "text-white"
                  : "text-neutral-500 hover:text-neutral-300"
              }`}
            >
              <span className="relative z-10">{tab.label}</span>
              {activeTab === tab.id && (
                <motion.div
                  layoutId="activeConsoleTabBadge"
                  className="absolute bottom-0 left-0 right-0 h-[2px] bg-slate-300 rounded-t-full"
                />
              )}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-4 px-2">
          <div className="flex items-center gap-2">
            <div className={`flex h-1.5 w-1.5 rounded-full ${isRunning ? "bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-neutral-600"}`} />
            <span className="text-[10px] font-bold tracking-widest text-neutral-500 uppercase">
              {isRunning ? "Executing..." : "Ready"}
            </span>
          </div>
          {onToggleExpand && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpand();
              }}
              className="flex items-center justify-center h-6 w-6 rounded hover:bg-[#333] transition-colors text-neutral-400 hover:text-white"
              title={isExpanded ? "Collapse Console" : "Expand Console"}
            >
              {isExpanded ? (
                 <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 15 12 9 18 15"/></svg>
              ) : (
                 <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Tab content */}
      <div className={`flex-1 min-h-0 overflow-hidden font-mono transition-opacity duration-300 ${isExpanded ? 'opacity-100' : 'opacity-0'}`}>
        {activeTab === "console" && renderConsoleTab()}
        {activeTab === "ai" && renderAiFeedbackTab()}
        {activeTab === "edges" && renderEdgeCasesTab()}
      </div>

      {/* Fullscreen Flowchart Modal */}
      <AnimatePresence>
        {isFullscreen && flowchartData && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col bg-transparent text-gray-300"
          >
            <div className="flex shrink-0 items-center justify-between border-b border-[#333] bg-[#252526] px-6 py-4">
              <h2 className="text-lg font-bold text-violet-400">Flowchart Viewer</h2>
              <button
                onClick={() => setIsFullscreen(false)}
                className="rounded text-gray-400 hover:text-white hover:bg-[#333] p-1.5 transition-colors"
                title="Close Fullscreen"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
              </button>
            </div>

            <div className="flex-1 min-h-0 relative">
              <TransformWrapper
                initialScale={1}
                minScale={0.1}
                maxScale={8}
                centerOnInit={true}
                wheel={{ step: 0.1 }}
              >
                {({ zoomIn, zoomOut, resetTransform }) => (
                  <>
                    <div className="absolute top-4 right-4 z-10 flex gap-3 shadow-lg p-2 bg-[#252526]/80 backdrop-blur rounded-lg border border-[#333]">
                      <button onClick={() => zoomIn()} className="rounded bg-[#1f2937] px-3 py-1.5 text-sm font-medium text-gray-200 hover:bg-[#374151] hover:text-white transition-colors">Zoom In</button>
                      <button onClick={() => zoomOut()} className="rounded bg-[#1f2937] px-3 py-1.5 text-sm font-medium text-gray-200 hover:bg-[#374151] hover:text-white transition-colors">Zoom Out</button>
                      <button onClick={() => resetTransform()} className="rounded bg-[#1f2937] px-3 py-1.5 text-sm font-medium text-gray-200 hover:bg-[#374151] hover:text-white transition-colors">Reset View</button>
                    </div>
                    <TransformComponent wrapperStyle={{ width: "100%", height: "100%" }} contentStyle={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <div ref={fullscreenMermaidRef} className="mermaid-container w-full h-full flex items-center justify-center p-8" />
                    </TransformComponent>
                  </>
                )}
              </TransformWrapper>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
