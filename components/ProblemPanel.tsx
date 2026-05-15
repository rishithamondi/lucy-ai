"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { twoSumProblem } from "@/lib/problems";

interface ProblemPanelProps {
  title?: string;
  description?: string;
  constraints?: string[];
  examples?: Array<{
    input: string;
    output: string;
  }>;
  onImportProblem?: (text: string) => void;
  isImporting?: boolean;
  activeTab: "problem" | "visualizer" | "complexity";
  onActiveTabChange: (tab: "problem" | "visualizer" | "complexity") => void;
  detectedComplexity?: string;
  showComplexityGraph?: boolean;
  flowchartData?: { mermaid: string; explanation: string } | null;
  isGeneratingFlowchart?: boolean;
  onGenerateFlowchart?: () => void;
  onTimeComplexity?: () => void;
  codeAnalysis?: any;
  complexityReport?: any;
  isAnalyzingComplexity?: boolean;
}

export const defaultProblem = twoSumProblem;

export default function ProblemPanel({
  title,
  description,
  constraints,
  examples,
  onImportProblem,
  isImporting = false,
  activeTab,
  onActiveTabChange,
  detectedComplexity,
  showComplexityGraph = false,
  flowchartData = null,
  isGeneratingFlowchart = false,
  onGenerateFlowchart,
  onTimeComplexity,
  codeAnalysis = null,
  complexityReport = "",
  isAnalyzingComplexity = false,
}: ProblemPanelProps) {
  const [importText, setImportText] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isGraphFullscreen, setIsGraphFullscreen] = useState(false);
  const [complexityType, setComplexityType] = useState<"time" | "space">("time");
  const mermaidRef = useRef<HTMLDivElement>(null);
  const fullscreenMermaidRef = useRef<HTMLDivElement>(null);

  const dataKeys = ["O(1)", "O(log n)", "O(n)", "O(n log n)", "O(n^2)"];
  const colors: Record<string, string> = {
    "O(1)": "#a855f7",
    "O(log n)": "#06b6d4",
    "O(n)": "#10b981",
    "O(n log n)": "#f59e0b",
    "O(n^2)": "#ef4444",
  };

  useEffect(() => {
    let isMounted = true;
    if ((activeTab === "visualizer" || isFullscreen) && flowchartData?.mermaid) {
      // Clear containers before starting
      if (mermaidRef.current) mermaidRef.current.innerHTML = "";
      if (fullscreenMermaidRef.current) fullscreenMermaidRef.current.innerHTML = "";

      import("mermaid").then((mermaidModule) => {
        if (!isMounted) return;
        const mermaid = mermaidModule.default;
        mermaid.initialize({
          startOnLoad: false,
          theme: "dark",
          securityLevel: "loose",
          flowchart: {
            nodeSpacing: 50,
            rankSpacing: 50,
            useMaxWidth: false,
          },
        });

        // Use unique IDs based on timestamp to avoid collision
        const timestamp = Date.now();
        const panelId = `flowchart-svg-panel-${timestamp}`;
        const fullId = `flowchart-svg-full-${timestamp}`;

        const renderFlowchart = async () => {
          try {
            const { svg: panelSvg } = await mermaid.render(panelId, flowchartData.mermaid);
            if (isMounted && mermaidRef.current) {
               mermaidRef.current.innerHTML = panelSvg;
            }

            if (isFullscreen) {
              const { svg: fullSvg } = await mermaid.render(fullId, flowchartData.mermaid);
              if (isMounted && fullscreenMermaidRef.current) {
                 fullscreenMermaidRef.current.innerHTML = fullSvg;
              }
            }
          } catch (e) {
            console.error("Mermaid error:", e);
            if (isMounted) {
              const errorHtml = `<div class="text-red-400 p-8 text-xs bg-red-900/10 border border-red-500/20 rounded-xl flex flex-col items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                <span>Visualizer Syntax Error. Try regenerating.</span>
              </div>`;
              if (mermaidRef.current) mermaidRef.current.innerHTML = errorHtml;
            }
          }
        };

        renderFlowchart();
      });
    }
    return () => { isMounted = false; };
  }, [flowchartData, activeTab, isFullscreen]);

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

  const renderTabPlaceholder = ({
    icon,
    title,
    description,
    buttonLabel,
    onButtonClick,
    isLoading = false,
  }: {
    icon: React.ReactNode;
    title: string;
    description: string;
    buttonLabel?: string;
    onButtonClick?: () => void;
    isLoading?: boolean;
  }) => (
    <div className="flex-1 flex flex-col items-center justify-start mt-24 p-8 text-center min-h-[400px] space-y-6">
      <div className="h-20 w-20 bg-slate-800/30 border border-[#3a3a3a] rounded-2xl flex items-center justify-center relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        {isLoading ? (
          <div className="h-8 w-8 border-2 border-slate-700 border-t-violet-500 rounded-full animate-spin" />
        ) : (
          icon
        )}
      </div>
      <div className="space-y-2 max-w-[300px]">
        <h2 className="text-lg font-bold text-white tracking-tight">{isLoading ? "Processing..." : title}</h2>
        <p className="text-sm text-neutral-500 leading-relaxed">{description}</p>
      </div>
      {buttonLabel && !isLoading && (
        <div className="w-full max-w-sm flex justify-center">
          <button
            onClick={onButtonClick}
            className="w-full rounded-xl bg-[#333333] border border-[#3a3a3a] px-4 py-2.5 text-sm font-bold text-slate-200 transition-all hover:bg-[#404040]"
          >
            {buttonLabel}
          </button>
        </div>
      )}
    </div>
  );

  const handleLoadProblem = () => {
    const trimmed = importText.trim();
    if (!trimmed || !onImportProblem) return;
    onImportProblem(trimmed);
  };

  const renderProblemTab = () => {
    // Empty state — no problem loaded yet
    if (!title) {
      return (
        <div className="flex-1 flex flex-col items-center justify-start mt-24 p-8 text-center min-h-[400px] space-y-6">
          {/* Icon */}
          <div className="h-20 w-20 bg-slate-800/30 border border-[#3a3a3a] rounded-2xl flex items-center justify-center relative overflow-hidden group">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
              <polyline points="10 9 9 9 8 9"/>
            </svg>
          </div>

          {/* Text */}
          <div className="space-y-2 max-w-[300px]">
            <h2 className="text-lg font-bold text-white tracking-tight">No problem loaded</h2>
            <p className="text-sm text-neutral-500 leading-relaxed">
              Import or select a problem to begin.
            </p>
          </div>

          {/* Inline import form */}
          <div className="w-full max-w-sm space-y-3">
            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              className="h-28 w-full resize-none rounded-xl border border-[#4a4a4a] bg-[#1a1a1a] px-4 py-3 text-xs text-gray-100 outline-none transition-colors placeholder:text-gray-600 hover:border-slate-500 focus:border-slate-400"
              placeholder="Paste a problem statement here (title, description, examples)..."
            />
            <button
              type="button"
              onClick={handleLoadProblem}
              disabled={!importText.trim() || isImporting || !onImportProblem}
              className="w-full rounded-xl bg-violet-600/20 border border-violet-500/30 px-4 py-2.5 text-sm font-bold text-violet-300 transition-all hover:bg-violet-600/30 hover:border-violet-500/50 disabled:cursor-not-allowed disabled:opacity-30"
            >
              {isImporting ? "Parsing problem..." : "Load Problem"}
            </button>
          </div>
        </div>
      );
    }

    return (
    <div className="flex-1 overflow-y-auto p-6 space-y-10">
      {/* Problem Content */}
      <section className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-4 w-1 bg-slate-700 rounded-full" />
          <h1 className="text-xl font-bold text-white tracking-tight">
            {title}
          </h1>
        </div>

        <div className="space-y-4 text-neutral-300">
          {(description ?? "").split("\n\n").map((para, i) => (
            <p key={i} className="text-[14px] leading-relaxed font-normal">
              {para}
            </p>
          ))}
        </div>

        <div className="space-y-4">
          <h2 className="text-sm font-bold text-neutral-400 uppercase tracking-widest flex items-center gap-2">
            <span className="flex h-1.5 w-1.5 rounded-full bg-slate-700" />
            Constraints
          </h2>
          <ul className="grid grid-cols-1 gap-2">
            {(constraints ?? []).map((c, i) => (
              <li key={i} className="flex items-start gap-3 rounded-lg bg-[#2a2a2a] border border-[#3a3a3a] px-4 py-2.5 text-sm text-neutral-400">
                <span className="text-neutral-600 mt-0.5">•</span>
                {c}
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-5">
          <h2 className="text-sm font-bold text-neutral-400 uppercase tracking-widest flex items-center gap-2">
            <span className="flex h-1.5 w-1.5 rounded-full bg-slate-700" />
            Examples
          </h2>
          <div className="space-y-4">
            {(examples ?? []).map((ex, i) => (
              <div
                key={i}
                className="relative overflow-hidden rounded-xl border border-[#3a3a3a] bg-[#2a2a2a] p-4 transition-colors hover:bg-[#333333]"
              >
                <div className="absolute top-0 right-0 p-2">
                  <span className="text-[9px] font-black uppercase tracking-widest text-neutral-600">Case {i + 1}</span>
                </div>
                <div className="space-y-3">
                  <div className="flex flex-col gap-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Input</p>
                    <code className="block rounded-lg bg-[#1a1a1a] px-3 py-1.5 text-sm font-mono text-neutral-300 border border-[#3a3a3a]">
                      {ex.input}
                    </code>
                  </div>
                  <div className="flex flex-col gap-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Output</p>
                    <code className="block rounded-lg bg-[#1a1a1a] px-3 py-1.5 text-sm font-mono text-neutral-300 border border-[#3a3a3a]">
                      {ex.output}
                    </code>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Import Section */}
      <section className="rounded-xl border border-[#3a3a3a] bg-[#2a2a2a] p-4 mt-8 opacity-80 hover:opacity-100 transition-opacity">
        <details>
          <summary className="cursor-pointer text-sm font-medium text-gray-400 hover:text-white flex items-center gap-2 outline-none">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Import Different Problem
          </summary>
          <div className="mt-4 space-y-3">
            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              className="h-24 w-full resize-none rounded-lg border border-[#3a3a3a] bg-[#1a1a1a] px-3 py-2 text-xs text-gray-100 outline-none transition-colors placeholder:text-gray-600 hover:border-slate-500 focus:border-slate-400"
              placeholder="Paste problem statement (title, description)..."
            />
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={handleLoadProblem}
                disabled={!importText.trim() || isImporting || !onImportProblem}
                className="rounded-lg bg-[#333333] border border-[#3a3a3a] px-3 py-1.5 text-[11px] font-bold text-[#c9d1d9] transition-colors hover:bg-[#404040] disabled:cursor-not-allowed disabled:opacity-30"
              >
                {isImporting ? "Parsing..." : "Load Problem"}
              </button>
            </div>
          </div>
        </details>
      </section>
    </div>
  );
  };

  const renderVisualizerTab = () => (
    <div className="flex-1 flex flex-col min-h-0 bg-transparent">
      {flowchartData ? (
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Logic Flow</span>
              <span className="text-[14px] font-black tracking-tight text-white">Algorithm Flowchart</span>
            </div>
            <button
              onClick={() => setIsFullscreen(true)}
              className="p-1.5 rounded-lg bg-slate-800/50 text-neutral-400 hover:bg-slate-700 hover:text-white transition-all border border-[#3a3a3a]"
              title="Fullscreen"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
            </button>
          </div>

          {/* Flowchart Box - Styled like Complexity Graph */}
          <div className="relative h-[400px] w-full rounded-2xl bg-[#141414] border border-[#3a3a3a] shadow-2xl overflow-hidden group">
            <TransformWrapper
              initialScale={1}
              minScale={0.1}
              maxScale={8}
              centerOnInit={true}
            >
              {({ zoomIn, zoomOut, resetTransform }) => (
                <>
                  <div className="absolute top-4 right-4 z-10 flex gap-2 overflow-hidden opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <button
                      onClick={() => zoomIn()}
                      className="h-8 w-8 flex items-center justify-center rounded-lg bg-[#1f2937] text-gray-300 border border-[#4a4a4a] hover:bg-[#374151] shadow-xl"
                    >
                      +
                    </button>
                    <button
                      onClick={() => zoomOut()}
                      className="h-8 w-8 flex items-center justify-center rounded-lg bg-[#1f2937] text-gray-300 border border-[#4a4a4a] hover:bg-[#374151] shadow-xl"
                    >
                      -
                    </button>
                    <button
                      onClick={() => resetTransform()}
                      className="px-3 py-1 rounded-lg bg-[#1f2937] text-[10px] font-bold uppercase text-gray-300 border border-[#4a4a4a] hover:bg-[#374151] shadow-xl"
                    >
                      Reset
                    </button>
                  </div>
                  <TransformComponent
                    wrapperClass="!w-full !h-full"
                    contentClass="!w-full !h-full flex items-center justify-center"
                  >
                    <div ref={mermaidRef} className="mermaid-container p-8" />
                  </TransformComponent>
                </>
              )}
            </TransformWrapper>
          </div>

          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <div className="h-4 w-1 bg-violet-500 rounded-full" />
              <h3 className="text-[11px] font-bold text-neutral-500 uppercase tracking-[0.2em]">
                Step-by-Step Logic
              </h3>
            </div>
            <div className="grid grid-cols-1 gap-4">
              {flowchartData.explanation
                .split(/\d+\.\s+/)
                .filter(Boolean)
                .map((step, idx) => (
                  <div
                    key={idx}
                    className="flex gap-4 p-5 rounded-2xl bg-[#252526] border border-[#3a3a3a] transition-all hover:border-violet-500/20 group/step"
                  >
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-[10px] font-bold text-violet-400 border border-violet-500/20 group-hover/step:bg-violet-500/20 transition-colors">
                      {idx + 1}
                    </div>
                    <p className="text-[14px] text-neutral-300 leading-relaxed font-light">
                      {step.trim()}
                    </p>
                  </div>
                ))}
            </div>
          </div>
        </div>
      ) : isGeneratingFlowchart ? (
        renderTabPlaceholder({
          icon: null,
          title: "Mapping Logic Structure",
          description:
            "Our Intelligence Engine is parsing your code structure to generate a step-by-step logic flowchart...",
          isLoading: true,
        })
      ) : (
        renderTabPlaceholder({
          icon: (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#64748b"
              strokeWidth="1.5"
            >
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
          ),
          title: "Algorithm Visualizer",
          description:
            "Generate a step-by-step logic flowchart of the optimal solution.",
          buttonLabel: "Generate Flowchart",
          onButtonClick: onGenerateFlowchart,
        })
      )}
    </div>
  );

  const renderComplexityTab = () => {
    const report = complexityReport?.[complexityType];
    const detectedValue = report?.value || "";

    // Detective logic for graph highlighting based on current type
    let activeComplexityForGraph = "";
    const lower = detectedValue.toLowerCase();
    if (lower.includes("o(log n)") || lower.includes("log n")) activeComplexityForGraph = "O(log n)";
    else if (lower.includes("o(n log n)") || lower.includes("n log n")) activeComplexityForGraph = "O(n log n)";
    else if (lower.includes("o(n^2)") || lower.includes("n^2") || lower.includes("o(n2)")) activeComplexityForGraph = "O(n^2)";
    else if (lower.includes("o(n)")) activeComplexityForGraph = "O(n)";
    else if (lower.includes("o(1)")) activeComplexityForGraph = "O(1)";

    return (
      <div className="flex-1 flex flex-col min-h-0 bg-transparent">
        {complexityReport ? (
          <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-10">
            {/* Header / Toggle in corner */}
            <div className="flex items-center justify-between">
              <h3 className="text-[11px] font-bold text-neutral-500 uppercase tracking-[0.2em]">Complexity Analysis</h3>
              <div className="flex items-center gap-3">
                <div className="flex bg-[#252526] p-0.5 rounded-lg border border-[#3a3a3a]">
                  <button
                    onClick={() => setComplexityType("time")}
                    className={`px-3 py-1 text-[9px] font-bold tracking-tight uppercase transition-all rounded-md ${
                      complexityType === "time" ? "bg-violet-500/10 text-violet-400 border border-violet-500/20" : "text-neutral-500 hover:text-neutral-300"
                    }`}
                  >
                    Time
                  </button>
                  <button
                    onClick={() => setComplexityType("space")}
                    className={`px-3 py-1 text-[9px] font-bold tracking-tight uppercase transition-all rounded-md ${
                      complexityType === "space" ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20" : "text-neutral-500 hover:text-neutral-300"
                    }`}
                  >
                    Space
                  </button>
                </div>
                <button
                  onClick={() => setIsGraphFullscreen(true)}
                  className="p-1.5 rounded-lg bg-slate-800/50 text-neutral-400 hover:bg-slate-700 hover:text-white transition-all border border-[#3a3a3a]"
                  title="Fullscreen"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
                </button>
              </div>
            </div>

            {/* 1. Graph at the TOP */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">{complexityType === "time" ? "Performance" : "Memory"} Growth</span>
                  <span className="text-[14px] font-black tracking-tight text-white">{complexityType === "time" ? "Time Complexity Graph" : "Space Complexity Graph"}</span>
                </div>
                <div className="px-2 py-0.5 rounded bg-slate-800 text-[10px] font-mono text-neutral-400 border border-[#3a3a3a]">
                  Detected: <span className={complexityType === "time" ? "text-violet-400" : "text-cyan-400"}>{report?.value}</span>
                </div>
              </div>
              
              <div className="h-[240px] w-full rounded-2xl bg-[#141414] border border-[#3a3a3a] p-4 overflow-hidden shadow-2xl group">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff03" vertical={false} />
                    <XAxis dataKey="n" hide />
                    <YAxis hide domain={[0, 1000000]} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#0d1117",
                        border: "1px solid rgba(255,255,255,0.05)",
                        borderRadius: "12px",
                        fontSize: "10px"
                      }}
                    />
                    {dataKeys.map((k: string) => (
                      <Line
                        key={k}
                        type="monotone"
                        dataKey={k}
                        stroke={colors[k]}
                        strokeWidth={activeComplexityForGraph === k ? 4 : 1.5}
                        dot={false}
                        opacity={activeComplexityForGraph === k ? 1 : 0.1}
                        animationDuration={1500}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <p className="text-[11px] text-neutral-500 leading-relaxed italic text-center px-4">
                {complexityType === "time" ? "Estimated operation counts as input size (n) increases." : "Estimated memory usage scaling relative to input size (n)."}
                <br/>
                <span className="text-neutral-400">Trend: {detectedValue.includes('O(1)') ? 'Constant' : (detectedValue.includes('log') ? 'Logarithmic' : (detectedValue.includes('n^2') ? 'Quadratic' : 'Linear'))} growth detected.</span>
              </p>
            </section>

            {/* 2. Big-O Section */}
            <section className="space-y-3 border-t border-[#3a3a3a] pt-8">
              <h3 className="text-[11px] font-bold text-neutral-500 uppercase tracking-[0.2em]">Analysis Summary</h3>
              <div className="flex items-center gap-4">
                <div className={`text-5xl font-black tracking-tighter ${complexityType === "time" ? "text-violet-400" : "text-cyan-400"}`}>
                  {report?.value || "O(?)"}
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-neutral-600 uppercase tracking-widest leading-none mb-1">Detected Level</span>
                  <div className="px-3 py-1 rounded-full bg-white/5 border border-[#4a4a4a] text-[10px] font-bold text-neutral-400 w-fit">
                    {report?.explanation || "Analyzing approach..."}
                  </div>
                </div>
              </div>
            </section>

            {/* 3. Reasoning */}
            <section className="space-y-3 border-t border-[#3a3a3a] pt-8">
              <h3 className="text-[11px] font-bold text-neutral-500 uppercase tracking-[0.2em]">Step-by-Step Reasoning</h3>
              <div className="p-5 rounded-2xl bg-[#252526] border border-[#3a3a3a] text-[14px] text-neutral-300 leading-relaxed font-light">
                {report?.reasoning || "No detailed reasoning available."}
              </div>
            </section>

            {/* 4. Optimality */}
            <section className="space-y-3 border-t border-[#3a3a3a] pt-8 pb-4">
              <h3 className="text-[11px] font-bold text-neutral-500 uppercase tracking-[0.2em]">Efficiency Rating</h3>
              <div className={`p-5 rounded-2xl border ${report?.isOptimal ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-400/80" : "bg-orange-500/5 border-orange-500/20 text-orange-400/80"} text-[14px] leading-relaxed`}>
                <div className="flex items-start gap-4">
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${report?.isOptimal ? "bg-emerald-500/10 text-emerald-400" : "bg-orange-500/10 text-orange-400"} border border-current/20`}>
                    {report?.isOptimal ? "✓" : "!"}
                  </div>
                  <div className="space-y-1">
                    <p className="font-bold text-[12px] uppercase tracking-wider">{report?.isOptimal ? "Optimal Solution Found" : "Optimization Suggested"}</p>
                    <p className="text-neutral-400 text-[13px]">{report?.optimalSuggestion}</p>
                  </div>
                </div>
              </div>
            </section>
          </div>
        ) : isAnalyzingComplexity ? (
          renderTabPlaceholder({
            icon: null,
            title: "Analyzing Complexity",
            description: "Evaluating time and space complexity based on the provided solution...",
            isLoading: true,
          })
        ) : (
          renderTabPlaceholder({
            icon: (
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="1.5">
                <path d="M12 2v20"/><path d="m17 17 5 5"/><path d="m7 7-5-5"/><path d="M22 2 2 22"/>
              </svg>
            ),
            title: "Complexity Analysis",
            description: "Analyze your code to calculate Big O time and space complexity with growth graphs.",
            buttonLabel: "Analyze Complexity",
            onButtonClick: onTimeComplexity,
          })
        )}
      </div>
    );
  };

  return (
    <div className="flex h-full flex-col overflow-hidden bg-background text-gray-300">
      {/* Tab Content */}
      <div className="flex-1 min-h-0 min-w-0 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: -5 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 5 }}
            transition={{ duration: 0.15 }}
            className="h-full flex flex-col"
          >
            {activeTab === "problem" && (
              <div className="flex-1 overflow-y-auto">{renderProblemTab()}</div>
            )}
            {activeTab === "visualizer" && (
              <div className="flex-1 overflow-y-auto">
                {renderVisualizerTab()}
              </div>
            )}
            {activeTab === "complexity" && (
              <div className="flex-1 overflow-y-auto">
                {renderComplexityTab()}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
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
            <div className="flex shrink-0 items-center justify-between border-b border-[#3a3a3a] bg-[#252526] px-6 py-3">
              <div className="flex flex-col">
                <h2 className="text-sm font-bold text-white uppercase tracking-widest">Logic Flowchart</h2>
                <span className="text-[10px] text-neutral-500">Interactive Visualization</span>
              </div>
              <button
                onClick={() => setIsFullscreen(false)}
                className="rounded-lg bg-slate-800 px-4 py-1.5 text-xs font-bold text-white transition-colors hover:bg-slate-700 border border-[#3a3a3a]"
              >
                Exit Fullscreen
              </button>
            </div>
            <div className="flex-1 min-h-0 relative overflow-hidden">
               <TransformWrapper initialScale={1.2} minScale={0.1} maxScale={8} centerOnInit={true}>
                {({ zoomIn, zoomOut, resetTransform }) => (
                  <>
                    <div className="absolute bottom-6 right-6 z-10 flex gap-2">
                      <button onClick={() => zoomIn()} className="h-10 w-10 flex items-center justify-center rounded-xl bg-[#1f2937] text-gray-300 border border-[#4a4a4a] hover:bg-[#374151] shadow-2xl">+</button>
                      <button onClick={() => zoomOut()} className="h-10 w-10 flex items-center justify-center rounded-xl bg-[#1f2937] text-gray-300 border border-[#4a4a4a] hover:bg-[#374151] shadow-2xl">-</button>
                      <button onClick={() => resetTransform()} className="px-4 py-2 flex items-center justify-center rounded-xl bg-[#1f2937] text-xs font-bold uppercase text-gray-300 border border-[#4a4a4a] hover:bg-[#374151] shadow-2xl">Reset</button>
                    </div>
                    <TransformComponent wrapperClass="!w-full !h-full" contentClass="!w-full !h-full flex items-center justify-center">
                      <div ref={fullscreenMermaidRef} className="mermaid-container p-20" />
                    </TransformComponent>
                  </>
                )}
              </TransformWrapper>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Fullscreen Complexity Graph Modal */}
      <AnimatePresence>
        {isGraphFullscreen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col bg-transparent text-gray-300"
          >
            <div className="flex shrink-0 items-center justify-between border-b border-[#3a3a3a] bg-[#252526] px-6 py-3">
              <div className="flex flex-col">
                <h2 className="text-sm font-bold text-white uppercase tracking-widest">{complexityType === "time" ? "Time" : "Space"} Growth Comparison</h2>
                <span className="text-[10px] text-neutral-500">Algorithmic {complexityType === "time" ? "Time" : "Space"} Complexity Growth Rate</span>
              </div>
              <button
                onClick={() => setIsGraphFullscreen(false)}
                className="rounded-lg bg-slate-800 px-4 py-1.5 text-xs font-bold text-white transition-colors hover:bg-slate-700 border border-[#3a3a3a]"
              >
                Exit Fullscreen
              </button>
            </div>
            <div className="flex-1 min-h-0 relative overflow-hidden bg-[#141414]">
               <TransformWrapper initialScale={1} minScale={0.1} maxScale={8} centerOnInit={true}>
                {({ zoomIn, zoomOut, resetTransform }) => (
                  <>
                    <div className="absolute bottom-6 right-6 z-10 flex gap-2">
                      <button onClick={() => zoomIn()} className="h-10 w-10 flex items-center justify-center rounded-xl bg-[#1f2937] text-gray-300 border border-[#4a4a4a] hover:bg-[#374151] shadow-2xl">+</button>
                      <button onClick={() => zoomOut()} className="h-10 w-10 flex items-center justify-center rounded-xl bg-[#1f2937] text-gray-300 border border-[#4a4a4a] hover:bg-[#374151] shadow-2xl">-</button>
                      <button onClick={() => resetTransform()} className="px-4 py-2 flex items-center justify-center rounded-xl bg-[#1f2937] text-xs font-bold uppercase text-gray-300 border border-[#4a4a4a] hover:bg-[#374151] shadow-2xl">Reset</button>
                    </div>
                    <TransformComponent wrapperClass="!w-full !h-full" contentClass="!w-full !h-full">
                       <div className="w-full h-full p-12">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                              <XAxis dataKey="n" stroke="#475569" label={{ value: 'Input Size (n)', position: 'insideBottom', offset: -10, fill: '#475569', fontSize: 12 }} />
                              <YAxis stroke="#475569" label={{ value: 'Operations', angle: -90, position: 'insideLeft', fill: '#475569', fontSize: 12 }} />
                              <Tooltip
                                contentStyle={{
                                  backgroundColor: "#0d1117",
                                  border: "1px solid rgba(255,255,255,0.05)",
                                  borderRadius: "12px",
                                  fontSize: "12px",
                                  boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)"
                                }}
                              />
                              <Legend verticalAlign="top" height={36} wrapperStyle={{ paddingBottom: '20px' }} />
                              {[ "O(1)", "O(log n)", "O(n)", "O(n log n)", "O(n^2)" ].map((k: string) => {
                                const report = complexityReport?.[complexityType];
                                const detectedValue = report?.value || "";
                                const lower = detectedValue.toLowerCase();
                                let isActive = false;
                                if (lower.includes(k.toLowerCase()) && !((k === "O(n)" || k === "O(log n)") && lower.includes("n log n"))) {
                                   isActive = true;
                                }

                                return (
                                  <Line
                                    key={k}
                                    type="monotone"
                                    dataKey={k}
                                    stroke={colors[k]}
                                    strokeWidth={isActive ? 4 : 2}
                                    dot={{ r: isActive ? 4 : 0 }}
                                    opacity={isActive ? 1 : 0.3}
                                    animationDuration={1500}
                                  />
                                );
                              })}
                            </LineChart>
                          </ResponsiveContainer>
                       </div>
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

