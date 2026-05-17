"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { motion, AnimatePresence } from "framer-motion";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

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
  isFullscreenMode?: boolean;
  onToggleFullscreen?: () => void;
}

const CenteredPanelPlaceholder = ({
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
  <div className="h-full flex items-center justify-center p-6 text-center animate-in fade-in duration-300">
    <div className="max-w-[400px] flex flex-col items-center">
      <div className="text-neutral-500 mb-2">
        {React.isValidElement(icon) 
          ? React.cloneElement(icon as React.ReactElement, { width: 18, height: 18, strokeWidth: 1.5 })
          : icon}
      </div>
      <span className="text-[11px] font-bold text-neutral-300 tracking-wider uppercase mb-1">{title}</span>
      <p className="text-[13px] text-neutral-500 leading-relaxed max-w-[320px] font-sans">
        {description}
      </p>
      {button && (
        <button
          type="button"
          onClick={button.onClick}
          disabled={button.disabled}
          className={`mt-3 px-3 py-1 rounded bg-[#252526] border border-[#2a2a2a] text-[10px] font-bold text-neutral-300 hover:bg-[#2a2a2b] hover:text-white transition-colors active:scale-95 ${button.className}`}
        >
          {button.label}
        </button>
      )}
    </div>
  </div>
);

const PanelFlatLayout = ({
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
  <div className="flex flex-col h-full min-h-0 w-full">
    {children ? (
      children
    ) : (
      <CenteredPanelPlaceholder
        icon={icon}
        title={title}
        description={description}
        button={button}
      />
    )}
  </div>
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
  isFullscreenMode = false,
  onToggleFullscreen,
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

    return (
      <div className="bg-[#1a1a1a] border border-[#3a3a3a] rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex flex-col">
            <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest mb-0.5">Algorithmic Efficiency</span>
            <span className="text-[12px] text-neutral-400 font-sans">Growth rate comparison</span>
          </div>
          <div className="flex items-center gap-3">
            {dataKeys.map((key) => (
              <div key={key} className="flex items-center gap-1">
                <div className={`h-1.5 w-1.5 rounded-full ${key === "O(n^2)" ? "bg-red-500" : "bg-emerald-500"}`} />
                <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-tighter">{key}</span>
              </div>
            ))}
          </div>
        </div>
        
        <div className="h-[180px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff03" vertical={false} />
              <XAxis 
                dataKey="n" 
                stroke="#404040" 
                fontSize={9} 
                tickLine={false} 
                axisLine={false}
                tick={{ fill: '#666' }}
              />
              <YAxis 
                stroke="#404040" 
                fontSize={9} 
                tickLine={false} 
                axisLine={false}
                tick={{ fill: '#666' }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#0a0a0a', 
                  border: '1px solid #3a3a3a',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontFamily: 'sans-serif',
                  color: '#fff'
                }}
              />
              {dataKeys.map((key) => {
                const isSelected = detectedComplexity === key;
                return (
                  <Line
                    key={key}
                    type="monotone"
                    dataKey={key}
                    stroke={key === "O(n^2)" ? "#ef4444" : "#10b981"}
                    strokeWidth={isSelected ? 1.5 : 1}
                    dot={false}
                    opacity={isSelected ? 1 : 0.15}
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
      <div className="mt-4 border-t border-[#3a3a3a] pt-4 space-y-3">
        <div className="flex items-center gap-2 px-1">
          <div className="h-3 w-1 rounded-full bg-emerald-500" />
          <span className="text-[11px] font-bold tracking-wider text-neutral-400 uppercase">Code Intelligence</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Pattern & Score */}
          <div className="space-y-3">
            <div className="bg-[#1a1a1a] border border-[#3a3a3a] rounded-lg p-3 relative overflow-hidden">
              <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest mb-1">Detected Pattern</p>
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-bold text-white">{codeAnalysis.pattern.name}</span>
                <span className="text-[10px] font-bold text-neutral-500">{(codeAnalysis.pattern.confidence * 100).toFixed(0)}% confidence</span>
              </div>
            </div>

            <div className="bg-[#1a1a1a] border border-[#3a3a3a] rounded-lg p-3">
              <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest mb-2">Complexity Analysis</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] text-neutral-500">Time</p>
                  <p className="text-xs font-sans font-bold text-slate-200">{codeAnalysis.complexity.time}</p>
                </div>
                <div>
                  <p className="text-[10px] text-neutral-500">Space</p>
                  <p className="text-xs font-sans font-bold text-slate-200">{codeAnalysis.complexity.space}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Quality & Issues */}
          <div className="bg-[#1a1a1a] border border-[#3a3a3a] rounded-lg p-3 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest">Quality Score</p>
              <div className="flex items-baseline gap-0.5">
                <span className="text-base font-bold text-white">{codeAnalysis.quality.score}</span>
                <span className="text-[10px] font-bold text-neutral-500">/10</span>
              </div>
            </div>
            
            <div className="space-y-2">
              <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest">Potential Issues</p>
              <ul className="space-y-1.5">
                {codeAnalysis.quality.issues.map((issue: string, i: number) => (
                  <li key={i} className="flex items-start gap-2 text-[14px] text-neutral-300 leading-relaxed font-sans">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                    <span>{issue}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Wrong Approach Detector */}
        {codeAnalysis.wrongApproach?.detected && (
          <div className="bg-[#1a1a1a] border border-red-500/20 rounded-lg p-3 space-y-2">
             <div className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                <span className="text-[11px] font-bold text-red-400 uppercase tracking-widest">Suboptimal Approach</span>
             </div>
             <p className="text-[14px] text-neutral-300 leading-relaxed font-sans">
               {codeAnalysis.wrongApproach.issue}
             </p>
             <div className="bg-[#111111] rounded-lg p-2.5 border border-[#3a3a3a] mt-1">
                <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest mb-1">Recommendation</p>
                <p className="text-[14px] text-neutral-300 leading-relaxed font-sans">{codeAnalysis.wrongApproach.suggestion}</p>
             </div>
          </div>
        )}
      </div>
    );
  };

  const renderConsoleTab = () => {
    return (
      <PanelFlatLayout
        icon={<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>}
        title="Console Output"
        description="Run your code to see execution output and test results here."
      >
        {(testResults.length > 0 || consoleOutput) ? (
          <div className="space-y-3">
            {testResults.map((result) => (
              <div
                key={result.id}
                className="bg-[#1a1a1a] border border-[#3a3a3a] rounded-lg p-3 transition-colors"
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-bold text-neutral-300">
                    Test Case {result.id}
                  </span>
                  <span
                    className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${
                      result.status === "pass"
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        : result.status === "fail"
                          ? "bg-red-500/10 text-red-400 border border-red-500/20"
                          : "bg-neutral-500/10 text-neutral-400 border border-neutral-500/20"
                    }`}
                  >
                    {result.status === "pass" ? "Passed" : result.status === "fail" ? "Failed" : "Pending"}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <p className="text-[11px] uppercase tracking-widest text-neutral-500 font-bold">Input</p>
                    <pre className="text-xs font-mono text-neutral-300 bg-[#111111] px-3 py-1.5 rounded-lg border border-[#3a3a3a] overflow-x-auto">
                      {result.input}
                    </pre>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[11px] uppercase tracking-widest text-neutral-500 font-bold">Output</p>
                    <pre className="text-xs font-mono text-neutral-300 bg-[#111111] px-3 py-1.5 rounded-lg border border-[#3a3a3a] overflow-x-auto">
                      {result.actualOutput || result.output}
                    </pre>
                  </div>
                </div>

                {result.status === "fail" && (
                  <div className="mt-3 border-t border-[#3a3a3a] pt-3">
                    <div className="flex items-center justify-between mb-1.5">
                       <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-widest">Lucy AI Explanation</span>
                       <button
                         onClick={() => handleExplainError(result)}
                         disabled={loadingIds.has(result.id)}
                         className="text-[11px] font-bold text-emerald-400 hover:text-emerald-300 transition-colors uppercase tracking-widest disabled:opacity-50"
                       >
                         {loadingIds.has(result.id) ? "Analyzing..." : "Explain Error"}
                       </button>
                    </div>
                    <div className="bg-[#111111] rounded-lg p-3 border border-[#3a3a3a] text-[13px] text-neutral-300 leading-relaxed font-sans">
                      {explanations[result.id] || "No explanation available. Click 'Explain Error' to generate insights."}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {consoleOutput && (
              <div className="bg-[#1a1a1a] border border-[#3a3a3a] rounded-lg p-3 shadow-sm">
                 <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest mb-2">Execution Logs</p>
                 <pre className="text-xs font-mono text-neutral-300 bg-[#111111] p-3 rounded-lg border border-[#3a3a3a] overflow-x-auto whitespace-pre-wrap leading-relaxed">
                   {consoleOutput}
                 </pre>
              </div>
            )}
            
            {renderCodeAnalysisReport()}
          </div>
        ) : isRunning ? (
          <CenteredPanelPlaceholder
            icon={
              <div className="relative h-5 w-5">
                <div className="absolute inset-0 rounded-full border border-neutral-800" />
                <div className="absolute inset-0 rounded-full border border-t-emerald-500 animate-spin" />
              </div>
            }
            title="Executing Code"
            description="Processing your solution and running test cases against our validation engine..."
          />
        ) : undefined}
      </PanelFlatLayout>
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
      explanationText = "Constant runtime regardless of input size.";
    } else if (isLogN) {
      detectedName = "O(log n)";
      explanationText = "Logarithmic runtime—extremely efficient.";
    } else if (isN) {
      detectedName = "O(n)";
      explanationText = "Linear runtime relative to input size.";
    } else if (isNLogN) {
      detectedName = "O(n log n)";
      explanationText = "Typical runtime for efficient sorting algorithms.";
    } else if (isN2) {
      detectedName = "O(n²)";
      explanationText = "Quadratic runtime—slows down for large inputs.";
    }

    const sections = aiFeedback ? aiFeedback.split(/(?=(?:^|\n)##+ )/).filter((s: string) => s.trim().length > 0) : [];
    
    let reportTitle = "AI Feedback";
    let reportIcon = <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>;
    
    const filteredSections = sections.filter(section => {
      const trimmed = section.trim();
      if (trimmed.startsWith("## Analyze Report")) {
        reportTitle = "Analyze Report";
        reportIcon = <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="8"/></svg>;
        return false;
      }
      if (trimmed.startsWith("## Debug Report")) {
        reportTitle = "Debug Report";
        reportIcon = <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.7-3.7a1 1 0 0 0 0-1.4l-1.6-1.6a1 1 0 0 0-1.4 0l-3.7 3.7Z"/><path d="m2 22 5-5"/><path d="M9.5 14.5 16 8"/><path d="m14 2 8 8"/><path d="m2 14 8 8"/></svg>;
        return false;
      }
      if (trimmed.startsWith("## AI Hint")) {
        reportTitle = "AI Hint";
        reportIcon = <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></svg>;
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
      <PanelFlatLayout
        icon={reportIcon}
        title={reportTitle}
        description={panelDescription}
      >
        {isAnalyzing || isDebugging || isHinting ? (
          <CenteredPanelPlaceholder
            icon={
              <div className="relative h-5 w-5">
                <div className="absolute inset-0 rounded-full border border-neutral-800" />
                <div className="absolute inset-0 rounded-full border border-t-emerald-500 animate-spin" />
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
          <div className="space-y-3">
            {detectedComplexity && reportTitle !== "Debug Report" && (
              <div className="flex items-center gap-3 border-b border-[#2a2a2a] pb-3 mb-2">
                <div className={`px-2.5 py-1 rounded-lg border font-sans font-bold text-[13px] ${
                  isN2 ? "bg-red-500/10 text-red-400 border-red-500/20" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                }`}>
                  {detectedComplexity}
                </div>
                <div className="flex flex-col">
                  <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest">Detected Complexity</span>
                  <span className="text-[13px] text-neutral-400 font-medium font-sans">{explanationText}</span>
                </div>
              </div>
            )}

            {filteredSections.map((section: string, idx: number) => {
              const [titleLine, ...contentLines] = section.trim().split("\n");
              const title = titleLine.replace(/^##+\s*/, "");
              const content = contentLines.join("\n").trim();
              
              return (
                <div key={idx} className="bg-[#1a1a1a] border border-[#3a3a3a] rounded-lg p-3 space-y-2">
                  <span className="text-xs font-bold text-neutral-300">{title}</span>
                  <div className="text-[14px] text-neutral-300 leading-relaxed font-sans prose prose-invert prose-sm max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
                  </div>
                </div>
              );
            })}
          </div>
        ) : undefined}
      </PanelFlatLayout>
    );
  };

  const renderEdgeCasesTab = () => {
    return (
      <PanelFlatLayout
        icon={<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>}
        title="Edge Cases"
        description="Validate your algorithm against corner cases."
        button={onGenerateEdgeCases ? {
          label: isGeneratingEdgeCases ? "Generating..." : "Generate Edge Cases",
          onClick: onGenerateEdgeCases,
          disabled: isGeneratingEdgeCases,
          className: "bg-[#252526] border border-[#2a2a2a] text-[#c9d1d9] hover:bg-[#333]"
        } : undefined}
      >
        {edgeCases ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-[#2a2a2a] pb-2 mb-2">
              <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest">Edge Case Analysis</span>
              <button
                type="button"
                onClick={onGenerateEdgeCases}
                disabled={!onGenerateEdgeCases || isGeneratingEdgeCases}
                className="text-[11px] font-bold text-emerald-400 hover:text-emerald-300 transition-colors uppercase tracking-widest disabled:opacity-50"
              >
                {isGeneratingEdgeCases ? "Regenerating..." : "Regenerate"}
              </button>
            </div>
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                ol: ({ node, ...props }: any) => <ol className="flex flex-col gap-3 list-decimal pl-4" {...props} />,
                ul: ({ node, ...props }: any) => <ul className="flex flex-col gap-3 list-disc pl-4" {...props} />,
                li: ({ node, ...props }: any) => (
                  <li className="bg-[#1a1a1a] border border-[#3a3a3a] rounded-lg p-3 mb-2 list-none" {...props} />
                ),
                strong: ({ node, children, ...props }) => (
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <div className="h-3 w-1 rounded bg-emerald-500" />
                    <strong className="text-sm font-bold text-white tracking-tight font-sans" {...props}>{children}</strong>
                  </div>
                ),
                pre: ({ node, ...props }) => (
                  <pre className="font-mono bg-[#111111] p-3 rounded-lg text-xs overflow-x-auto text-neutral-300 border border-[#3a3a3a] leading-relaxed mt-2" {...props} />
                ),
                code: ({ node, inline, ...props }: any) => (
                  inline
                    ? <code className="bg-[#2a2a2a] text-emerald-400 px-1 py-0.5 rounded text-xs font-mono" {...props} />
                    : <code {...props} />
                ),
                p: ({ node, ...props }) => <p className="text-[14px] text-neutral-300 leading-relaxed font-sans" {...props} />,
              }}
            >
              {edgeCases}
            </ReactMarkdown>
          </div>
        ) : undefined}
      </PanelFlatLayout>
    );
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#1e1e1e] text-neutral-300 overflow-hidden font-sans">
      {/* Tabs */}
      <div 
        className="flex shrink-0 items-center justify-between border-b border-[#2a2a2a] bg-[#1e1e1e] px-2 h-[36px] cursor-pointer select-none"
        onClick={onToggleExpand}
      >
        <div className="flex gap-8 h-full pl-4">
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
              className={`relative h-full flex items-center text-[14px] font-medium transition-all ${
                activeTab === tab.id
                  ? "text-white"
                  : "text-neutral-400 hover:text-slate-200"
              }`}
            >
              <span className="relative z-10">{tab.label}</span>
              {activeTab === tab.id && (
                <motion.div
                  layoutId="activeConsoleTabBadge"
                  className="absolute bottom-0 left-0 right-0 h-[2px] bg-white rounded-t-full"
                />
              )}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-4 px-2">
          <div className="flex items-center gap-2">
            <div className={`flex h-1.5 w-1.5 rounded-full ${isRunning ? "bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-neutral-600"}`} />
            <span className="text-[9px] font-bold tracking-widest text-neutral-500 uppercase">
              {isRunning ? "Executing..." : "Ready"}
            </span>
          </div>
          {onToggleFullscreen && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleFullscreen();
              }}
              className="flex items-center justify-center h-6 w-6 rounded hover:bg-[#333] transition-colors text-neutral-400 hover:text-white"
              title={isFullscreenMode ? "Exit Fullscreen" : "Fullscreen"}
            >
              {isFullscreenMode ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 14h6v6M20 10h-6V4M14 10l7-7M10 14l-7 7"/></svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
              )}
            </button>
          )}
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
                 <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 15 12 9 18 15"/></svg>
              ) : (
                 <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 min-h-0 overflow-y-auto bg-[#1e1e1e] p-3 font-sans text-[14px] leading-relaxed font-normal scrollbar-thin scrollbar-thumb-white/5 scrollbar-track-transparent">
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
            className="fixed inset-0 z-50 flex flex-col bg-[#1e1e1e] text-gray-300 font-sans"
          >
            <div className="flex shrink-0 items-center justify-between border-b border-[#2a2a2a] bg-[#1e1e1e] px-6 py-4">
              <h2 className="text-sm font-bold text-emerald-400 uppercase tracking-wider">Flowchart Viewer</h2>
              <button
                onClick={() => setIsFullscreen(false)}
                className="rounded text-neutral-400 hover:text-white hover:bg-[#333] p-1.5 transition-colors"
                title="Close Fullscreen"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
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
                    <div className="absolute top-4 right-4 z-10 flex gap-2 p-1.5 bg-[#252526]/80 backdrop-blur rounded border border-[#2a2a2a]">
                      <button onClick={() => zoomIn()} className="rounded bg-[#1e1e1e] px-2.5 py-1 text-xs font-bold text-neutral-300 hover:bg-[#333] hover:text-white transition-colors">Zoom In</button>
                      <button onClick={() => zoomOut()} className="rounded bg-[#1e1e1e] px-2.5 py-1 text-xs font-bold text-neutral-300 hover:bg-[#333] hover:text-white transition-colors">Zoom Out</button>
                      <button onClick={() => resetTransform()} className="rounded bg-[#1e1e1e] px-2.5 py-1 text-xs font-bold text-neutral-300 hover:bg-[#333] hover:text-white transition-colors">Reset View</button>
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
