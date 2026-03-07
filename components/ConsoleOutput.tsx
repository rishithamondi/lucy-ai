"use client";

import { useState, useMemo, useEffect, useRef } from "react";
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
}

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
}: ConsoleOutputProps) {
  const [explanations, setExplanations] = useState<Record<number, string>>({});
  const [loadingIds, setLoadingIds] = useState<Set<number>>(new Set());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "console" | "ai" | "edges" | "visualizer"
  >("console");
  const mermaidRef = useRef<HTMLDivElement>(null);
  const fullscreenMermaidRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if ((activeTab === "visualizer" || isFullscreen) && flowchartData?.mermaid) {
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

  const renderConsoleTab = () => {
    if (testResults.length > 0) {
      return (
        <LearningPanelContainer>
          <div className="space-y-4">
            {testResults.map((result) => (
            <div
              key={result.id}
              className="rounded border border-[#333] bg-[#252526] p-3"
            >
              <div className="mb-2 flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-300">
                  Test Case {result.id}
                </span>
                <span
                  className={`text-xs font-medium ${
                    result.status === "pass"
                      ? "text-emerald-400"
                      : result.status === "fail"
                        ? "text-red-400"
                        : "text-gray-500"
                  }`}
                >
                  {result.status === "pass" && "✓ PASS"}
                  {result.status === "fail" && "✗ FAIL"}
                  {result.status === "pending" && "○ Pending"}
                </span>
              </div>
              <div className="space-y-1 text-xs text-gray-400">
                {result.input != null && (
                  <p>
                    <span className="text-gray-500">Input: </span>
                    {result.input}
                  </p>
                )}
                {result.expectedOutput != null && (
                  <p>
                    <span className="text-gray-500">Expected: </span>
                    {result.expectedOutput}
                  </p>
                )}
                {result.actualOutput != null && (
                  <p>
                    <span className="text-gray-500">Output: </span>
                    {result.actualOutput}
                  </p>
                )}
                <p>
                  <span className="text-gray-500">Result: </span>
                  <span
                    className={
                      result.status === "pass"
                        ? "text-emerald-400"
                        : result.status === "fail"
                          ? "text-red-400"
                          : "text-gray-400"
                    }
                  >
                    {result.status === "pass"
                      ? "PASS"
                      : result.status === "fail"
                        ? "FAIL"
                        : "Pending"}
                  </span>
                </p>
              </div>
              {result.status === "fail" && (
                <div className="mt-2">
                  <button
                    onClick={() => handleExplainError(result)}
                    disabled={loadingIds.has(result.id)}
                    className="rounded border border-amber-600 bg-transparent px-3 py-1.5 text-xs font-medium text-amber-400 transition-colors hover:bg-amber-600/20 disabled:opacity-50"
                  >
                    {loadingIds.has(result.id)
                      ? "Loading..."
                      : "Explain Error"}
                  </button>
                  {explanations[result.id] && (
                    <div className="mt-2 rounded border border-[#333] bg-[#1e1e1e] p-2">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-cyan-400">
                        AI Explanation:
                      </p>
                      <div className="bg-[#0f2438] border border-slate-700 rounded-lg p-4 space-y-3">
                        <ReactMarkdown 
                          remarkPlugins={[remarkGfm]}
                          components={{
                            p: ({ node, ...props }) => <p className="text-sm text-slate-300 leading-relaxed" {...props} />,
                            h3: ({ node, ...props }) => <h3 className="text-sm font-semibold text-cyan-300" {...props} />,
                            h4: ({ node, ...props }) => <h4 className="text-sm font-semibold text-cyan-300" {...props} />,
                            ul: ({ node, ...props }) => <ul className="list-disc pl-5 space-y-1 text-sm text-slate-300" {...props} />,
                            ol: ({ node, ...props }) => <ol className="list-decimal pl-5 space-y-1 text-sm text-slate-300" {...props} />,
                            code: ({ node, inline, ...props }) => (
                              inline 
                                ? <code className="bg-slate-800 text-cyan-300 px-1 py-0.5 rounded text-xs" {...props} /> 
                                : <pre className="font-mono bg-slate-900 p-2 rounded text-xs overflow-x-auto text-slate-300 mt-2 mb-2"><code {...props} /></pre>
                            ),
                          }}
                        >
                          {explanations[result.id]}
                        </ReactMarkdown>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            ))}
          </div>
        </LearningPanelContainer>
      );
    }

    if (consoleOutput) {
      return (
        <LearningPanelContainer>
          <pre className="whitespace-pre-wrap break-words text-slate-300 text-sm">
            {consoleOutput}
          </pre>
        </LearningPanelContainer>
      );
    }

    return (
      <LearningPanelContainer>
        <p className="text-slate-400">Run your code or interact with tools to see output here.</p>
      </LearningPanelContainer>
    );
  };

  const renderAiFeedbackTab = () => {
    const lower = detectedComplexity?.toLowerCase() ?? "";
    const isO1 = lower.includes("o(1)") || lower.includes("constant");
    const isLogN = lower.includes("log n") && !lower.includes("n log n");
    const isN = lower === "o(n)" || (lower.includes("o(n)") && !lower.includes("n log n") && !lower.includes("n^2"));
    const isNLogN = lower.includes("n log n");
    const isN2 =
      lower.includes("n^2") || lower.includes("n2") || lower.includes("n^ 2");

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

    const sections = aiFeedback ? aiFeedback.split(/(?=(?:^|\n)##+ )/).filter((s) => s.trim().length > 0) : [];

    return (
      <LearningPanelContainer>
        <div className="flex flex-col space-y-8">
          <div>
            <h3 className="mb-4 text-slate-100 font-semibold uppercase tracking-wide">
              AI Explanation
            </h3>
            {aiFeedback ? (
              <div className="flex flex-col gap-4">
                {sections.map((section, idx) => (
                  <div key={idx} className="bg-[#0f2438] border border-slate-700 rounded-lg p-4 space-y-3">
                    <ReactMarkdown 
                      remarkPlugins={[remarkGfm]}
                      components={{
                        h2: ({ node, ...props }) => <h2 className="text-sm font-semibold text-cyan-300" {...props} />,
                        h3: ({ node, ...props }) => <h3 className="text-sm font-semibold text-cyan-300" {...props} />,
                        h4: ({ node, ...props }) => <h4 className="text-sm font-semibold text-cyan-300" {...props} />,
                        p: ({ node, ...props }) => <p className="text-sm text-slate-300 leading-relaxed" {...props} />,
                        ul: ({ node, ...props }) => <ul className="list-disc pl-5 space-y-2 text-sm text-slate-300" {...props} />,
                        ol: ({ node, ...props }) => <ol className="list-decimal pl-5 space-y-2 text-sm text-slate-300" {...props} />,
                        code: ({ node, inline, ...props }) => (
                          inline 
                            ? <code className="bg-slate-800 text-cyan-300 px-1 py-0.5 rounded text-xs" {...props} /> 
                            : <pre className="font-mono bg-slate-900 p-3 rounded-md text-xs overflow-x-auto text-slate-300 mt-2 mb-2"><code {...props} /></pre>
                        ),
                      }}
                    >
                      {section}
                    </ReactMarkdown>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400">
                AI feedback from Get AI Hint, Analyze Code, and Time Complexity
                will appear here.
              </p>
            )}
          </div>

        {showComplexityGraph && detectedComplexity && (
          <div className="rounded-xl border border-slate-700 bg-[#0f2438] p-5 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="mb-1 text-base font-semibold text-slate-100">
                  Time Complexity Graph
                </p>
                <p className="text-sm text-slate-400">
                  Estimated operation counts as input size (n) increases.
                </p>
              </div>
              {detectedName !== "Unknown" && (
                <div className="flex flex-col items-end">
                  <span className="text-xs text-slate-400 mb-1">Detected</span>
                  <div className="rounded-full bg-slate-800 px-3 py-1 font-mono text-sm font-semibold text-cyan-300 ring-1 ring-cyan-500/30">
                    {detectedName}
                  </div>
                </div>
              )}
            </div>

            {explanationText && (
              <div className="mb-6 rounded bg-slate-800/50 p-3 border border-slate-700/50">
                <p className="text-sm text-slate-300">
                  <strong className="text-cyan-300 font-medium">Explanation: </strong>
                  {explanationText}
                </p>
              </div>
            )}
            
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid stroke="#1e293b" strokeDasharray="4 4" vertical={false} />
                <XAxis
                  dataKey="n"
                  stroke="#64748b"
                  tick={{ fill: "#94a3b8", fontSize: 12 }}
                  tickLine={false}
                  axisLine={{ stroke: "#334155" }}
                  label={{ value: "Input Size (n)", position: "insideBottomRight", offset: -5, fill: "#94a3b8", fontSize: 12 }}
                />
                <YAxis
                  stroke="#64748b"
                  tick={{ fill: "#94a3b8", fontSize: 12 }}
                  tickLine={false}
                  axisLine={{ stroke: "#334155" }}
                  label={{ value: "Estimated Operations", angle: -90, position: "insideLeft", offset: 0, fill: "#94a3b8", fontSize: 12 }}
                />
                <Tooltip
                  cursor={{ stroke: "#475569", strokeWidth: 1, strokeDasharray: "4 4" }}
                  contentStyle={{
                    backgroundColor: "#0f172a",
                    border: "1px solid #1e293b",
                    borderRadius: "8px",
                    color: "#f8fafc",
                    fontSize: "13px",
                    padding: "12px",
                    boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.5)"
                  }}
                  itemStyle={{ paddingBottom: "4px" }}
                  labelStyle={{ fontWeight: "600", marginBottom: "8px", color: "#94a3b8", paddingBottom: "8px", borderBottom: "1px solid #1e293b" }}
                  formatter={(value: number, name: string) => [
                    `${value.toLocaleString()} operations`, 
                    name
                  ]}
                  labelFormatter={(label) => `Input Size (n): ${label}`}
                />
                <Legend
                  wrapperStyle={{ fontSize: 12, color: "#cbd5e1", paddingTop: "15px" }}
                  iconType="circle"
                />
                <Line
                  type="monotone"
                  dataKey="O(1)"
                  stroke="#d946ef"
                  strokeWidth={isO1 ? 4 : 2}
                  strokeOpacity={isO1 ? 1 : 0.25}
                  dot={false}
                  isAnimationActive={true}
                  animationDuration={1500}
                  animationEasing="ease-out"
                  activeDot={{ r: 6, strokeWidth: 0, fill: "#d946ef" }}
                  style={isO1 ? { filter: "drop-shadow(0 0 6px rgba(217, 70, 239, 0.5))" } : {}}
                />
                <Line
                  type="monotone"
                  dataKey="O(log n)"
                  stroke="#06b6d4"
                  strokeWidth={isLogN ? 4 : 2}
                  strokeOpacity={isLogN ? 1 : 0.25}
                  dot={false}
                  isAnimationActive={true}
                  animationDuration={1600}
                  animationEasing="ease-out"
                  activeDot={{ r: 6, strokeWidth: 0, fill: "#06b6d4" }}
                  style={isLogN ? { filter: "drop-shadow(0 0 6px rgba(6, 182, 212, 0.5))" } : {}}
                />
                <Line
                  type="monotone"
                  dataKey="O(n)"
                  stroke="#22c55e"
                  strokeWidth={isN ? 4 : 2}
                  strokeOpacity={isN ? 1 : 0.25}
                  dot={false}
                  isAnimationActive={true}
                  animationDuration={1700}
                  animationEasing="ease-out"
                  activeDot={{ r: 6, strokeWidth: 0, fill: "#22c55e" }}
                  style={isN ? { filter: "drop-shadow(0 0 6px rgba(34, 197, 94, 0.5))" } : {}}
                />
                <Line
                  type="monotone"
                  dataKey="O(n log n)"
                  stroke="#eab308"
                  strokeWidth={isNLogN ? 4 : 2}
                  strokeOpacity={isNLogN ? 1 : 0.25}
                  dot={false}
                  isAnimationActive={true}
                  animationDuration={1800}
                  animationEasing="ease-out"
                  activeDot={{ r: 6, strokeWidth: 0, fill: "#eab308" }}
                  style={isNLogN ? { filter: "drop-shadow(0 0 6px rgba(234, 179, 8, 0.5))" } : {}}
                />
                <Line
                  type="monotone"
                  dataKey="O(n^2)"
                  stroke="#ef4444"
                  strokeWidth={isN2 ? 4 : 2}
                  strokeOpacity={isN2 ? 1 : 0.25}
                  dot={false}
                  isAnimationActive={true}
                  animationDuration={1900}
                  animationEasing="ease-out"
                  activeDot={{ r: 6, strokeWidth: 0, fill: "#ef4444" }}
                  style={isN2 ? { filter: "drop-shadow(0 0 6px rgba(239, 68, 68, 0.5))" } : {}}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
        </div>
      </LearningPanelContainer>
    );
  };

  const renderEdgeCasesTab = () => {
    return (
      <LearningPanelContainer>
        <div className="flex flex-col gap-5">
          <div>
            <button
              type="button"
              onClick={onGenerateEdgeCases}
              disabled={!onGenerateEdgeCases || isGeneratingEdgeCases}
              className="rounded border border-amber-600 bg-transparent px-3 py-1.5 text-sm font-medium text-amber-400 transition-colors hover:bg-amber-600/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isGeneratingEdgeCases ? "Generating edge cases..." : "Generate Edge Cases"}
            </button>
          </div>
          <div className="w-full">
            {edgeCases ? (
              <ReactMarkdown 
                remarkPlugins={[remarkGfm]}
                components={{
                  ol: ({ node, ...props }) => <div className="flex flex-col gap-4" {...props} />,
                  ul: ({ node, ...props }) => <div className="flex flex-col gap-4" {...props} />,
                  li: ({ node, ...props }) => (
                    <div className="bg-[#0f2438] border border-slate-700 rounded-lg p-5 space-y-4" {...props} />
                  ),
                  strong: ({ node, children, ...props }) => (
                    <strong className="text-base font-semibold text-white" {...props}>{children}</strong>
                  ),
                  pre: ({ node, ...props }) => (
                    <pre className="font-mono bg-slate-900 p-3 rounded-md text-xs overflow-x-auto text-slate-300 my-2" {...props} />
                  ),
                  code: ({ node, inline, ...props }) => (
                    inline 
                      ? <code className="bg-slate-800 text-cyan-300 px-1 py-0.5 rounded text-xs" {...props} /> 
                      : <code {...props} />
                  ),
                  p: ({ node, ...props }) => <p className="text-sm text-slate-300 leading-relaxed" {...props} />,
                }}
              >
                {edgeCases}
              </ReactMarkdown>
            ) : (
              <p className="text-sm text-slate-400">
                Generated edge test cases for the current problem will appear here.
              </p>
            )}
          </div>
        </div>
      </LearningPanelContainer>
    );
  };

  const renderVisualizerTab = () => {
    return (
      <LearningPanelContainer>
        <div className="flex h-full min-h-0 flex-col gap-5">
          <div className="shrink-0 flex items-center justify-between">
            <button
              type="button"
              onClick={onGenerateFlowchart}
              disabled={!onGenerateFlowchart || isGeneratingFlowchart}
              className="rounded border border-violet-600 bg-transparent px-3 py-1.5 text-xs font-medium text-violet-300 transition-colors hover:bg-violet-600/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isGeneratingFlowchart ? "Generating..." : "Generate Flowchart"}
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-hidden rounded border border-[#333] bg-[#111827] flex flex-col">
          {!flowchartData && !isGeneratingFlowchart && (
            <p className="text-gray-600 p-3">
              Click &quot;Generate Flowchart&quot; to create a flowchart breakdown of this algorithm.
            </p>
          )}
          {isGeneratingFlowchart && <p className="text-gray-500 p-3">Generating flowchart with AI...</p>}
          
          {flowchartData && (
            <div className="flex flex-col h-full min-h-0">
              <div className="flex-1 min-h-0 relative bg-[#0d1117] border-b border-[#333] overflow-hidden">
                <TransformWrapper
                  initialScale={1}
                  minScale={0.1}
                  maxScale={8}
                  centerOnInit={true}
                  wheel={{ step: 0.1 }}
                >
                  {({ zoomIn, zoomOut, resetTransform }) => (
                    <>
                      <div className="absolute top-2 right-2 z-10 flex gap-2">
                        <button onClick={() => zoomIn()} className="rounded bg-[#1f2937] px-2 py-1 text-xs text-gray-300 hover:bg-[#374151] border border-[#4b5563]">Zoom In</button>
                        <button onClick={() => zoomOut()} className="rounded bg-[#1f2937] px-2 py-1 text-xs text-gray-300 hover:bg-[#374151] border border-[#4b5563]">Zoom Out</button>
                        <button onClick={() => resetTransform()} className="rounded bg-[#1f2937] px-2 py-1 text-xs text-gray-300 hover:bg-[#374151] border border-[#4b5563]">Reset View</button>
                        <button onClick={() => setIsFullscreen(true)} className="rounded bg-violet-600/20 px-2 py-1 text-xs text-violet-300 hover:bg-violet-600/40 border border-violet-600/50">Fullscreen</button>
                      </div>
                      <TransformComponent wrapperStyle={{ width: "100%", height: "100%" }} contentStyle={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <div ref={mermaidRef} className="mermaid-container w-full h-full flex items-center justify-center p-4" />
                      </TransformComponent>
                    </>
                  )}
                </TransformWrapper>
              </div>
              <div className="shrink-0 p-4 bg-[#1f2937] max-h-[40%] overflow-y-auto w-full">
                <h3 className="text-sm font-bold text-violet-400 mb-2">Explanation</h3>
                <pre className="whitespace-pre-wrap text-sm text-gray-300 font-sans">
                  {flowchartData.explanation}
                </pre>
              </div>
            </div>
          )}
        </div>
        </div>
      </LearningPanelContainer>
    );
  };

  return (
    <div className="flex h-full flex-col bg-[#1e1e1e] text-gray-300">
      {/* Tabs */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#1e1e1e]">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("console")}
            className={`px-4 py-2 text-sm rounded-md transition-colors ${
              activeTab === "console"
                ? "bg-[#122c44] text-cyan-300"
                : "text-slate-400 hover:text-slate-200 hover:bg-[#2d3748]"
            }`}
          >
            Console
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("ai")}
            className={`px-4 py-2 text-sm rounded-md transition-colors ${
              activeTab === "ai"
                ? "bg-[#122c44] text-cyan-300"
                : "text-slate-400 hover:text-slate-200 hover:bg-[#2d3748]"
            }`}
          >
            AI Feedback
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("edges")}
            className={`px-4 py-2 text-sm rounded-md transition-colors ${
              activeTab === "edges"
                ? "bg-[#122c44] text-cyan-300"
                : "text-slate-400 hover:text-slate-200 hover:bg-[#2d3748]"
            }`}
          >
            Edge Cases
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("visualizer")}
            className={`px-4 py-2 text-sm rounded-md transition-colors ${
              activeTab === "visualizer"
                ? "bg-[#122c44] text-cyan-300"
                : "text-slate-400 hover:text-slate-200 hover:bg-[#2d3748]"
            }`}
          >
            Visualizer
          </button>
        </div>
        {isRunning && (
          <span className="text-xs text-amber-400">Running...</span>
        )}
      </div>

      {/* Tab content */}
      <div className="flex-1 min-h-0 overflow-hidden font-mono">
        {activeTab === "console" && renderConsoleTab()}
        {activeTab === "ai" && renderAiFeedbackTab()}
        {activeTab === "edges" && renderEdgeCasesTab()}
        {activeTab === "visualizer" && renderVisualizerTab()}
      </div>

      {/* Fullscreen Flowchart Modal */}
      <AnimatePresence>
        {isFullscreen && flowchartData && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col bg-[#0d1117] text-gray-300"
          >
            <div className="flex shrink-0 items-center justify-between border-b border-[#333] bg-[#161b22] px-6 py-4">
              <h2 className="text-lg font-bold text-violet-400">Flowchart Viewer</h2>
              <button
                onClick={() => setIsFullscreen(false)}
                className="rounded text-gray-400 hover:text-white hover:bg-[#333] p-1.5 transition-colors"
                title="Close Fullscreen"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
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
                    <div className="absolute top-4 right-4 z-10 flex gap-3 shadow-lg p-2 bg-[#161b22]/80 backdrop-blur rounded-lg border border-[#333]">
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
