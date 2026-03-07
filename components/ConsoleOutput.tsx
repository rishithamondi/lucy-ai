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

export type TestResult = {
  id: number;
  status: "pass" | "fail" | "pending";
  message?: string;
  output?: string;
  input?: string;
  expectedOutput?: string;
  actualOutput?: string;
};

export type VisualizerStep = {
  explanation: string;
  array?: number[];
  i?: number;
  j?: number;
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
  visualizerData?: { pattern: string; steps: VisualizerStep[] } | null;
  onVisualizeAlgorithm?: () => void;
  isVisualizing?: boolean;
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
  visualizerData = null,
  onVisualizeAlgorithm,
  isVisualizing = false,
}: ConsoleOutputProps) {
  const [explanations, setExplanations] = useState<Record<number, string>>({});
  const [loadingIds, setLoadingIds] = useState<Set<number>>(new Set());
  const [activeTab, setActiveTab] = useState<
    "console" | "ai" | "edges" | "visualizer"
  >("console");
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);

  useEffect(() => {
    if (visualizerData) {
      setCurrentStepIndex(0);
      setIsAutoPlaying(false);
    }
  }, [visualizerData]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isAutoPlaying && visualizerData && visualizerData.steps.length > 0) {
      interval = setInterval(() => {
        setCurrentStepIndex((prev) => {
          if (prev >= visualizerData.steps.length - 1) {
            setIsAutoPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [isAutoPlaying, visualizerData]);

  const complexityData = useMemo(() => {
    const ns = [10, 50, 100, 500, 1000];
    return ns.map((n) => ({
      n,
      logn: Math.log2(n),
      nLinear: n,
      nlogn: n * Math.log2(n),
      n2: n * n,
    }));
  }, []);

  const normalizedComplexityData = useMemo(() => {
    const maxValues = complexityData.reduce(
      (acc, point) => ({
        logn: Math.max(acc.logn, point.logn),
        nLinear: Math.max(acc.nLinear, point.nLinear),
        nlogn: Math.max(acc.nlogn, point.nlogn),
        n2: Math.max(acc.n2, point.n2),
      }),
      { logn: 1, nLinear: 1, nlogn: 1, n2: 1 }
    );

    return complexityData.map((point) => ({
      n: point.n,
      "O(log n)": point.logn / maxValues.logn,
      "O(n)": point.nLinear / maxValues.nLinear,
      "O(n log n)": point.nlogn / maxValues.nlogn,
      "O(n^2)": point.n2 / maxValues.n2,
    }));
  }, [complexityData]);



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
                      <p className="mb-1 text-xs font-medium text-amber-400">
                        AI Explanation:
                      </p>
                      <p className="whitespace-pre-wrap text-xs text-gray-300">
                        {explanations[result.id]}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      );
    }

    if (consoleOutput) {
      return (
        <pre className="whitespace-pre-wrap break-words text-gray-400">
          {consoleOutput}
        </pre>
      );
    }

    return (
      <p className="text-gray-600">
        Run your code or interact with tools to see output here.
      </p>
    );
  };

  const renderAiFeedbackTab = () => {
    const lower = detectedComplexity?.toLowerCase() ?? "";
    const isLogN = lower.includes("log n") && !lower.includes("n log n");
    const isN = lower === "o(n)" || (lower.includes("o(n)") && !lower.includes("n log n") && !lower.includes("n^2"));
    const isNLogN = lower.includes("n log n");
    const isN2 =
      lower.includes("n^2") || lower.includes("n2") || lower.includes("n^ 2");

    return (
      <div className="flex h-full flex-col gap-4">
        <div className="max-h-32 overflow-auto rounded border border-[#333] bg-[#111827] p-3">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">
            AI Explanation
          </p>
          {aiFeedback ? (
            <pre className="whitespace-pre-wrap break-words text-gray-400">
              {aiFeedback}
            </pre>
          ) : (
            <p className="text-gray-600">
              AI feedback from Get AI Hint, Analyze Code, and Time Complexity
              will appear here.
            </p>
          )}
        </div>

        {showComplexityGraph && detectedComplexity && (
          <div className="h-[180px] rounded border border-[#333] bg-[#050816] p-3">
            <p className="mb-1 text-xs font-semibold text-gray-300">
              Complexity Graph
            </p>
            <p className="mb-2 text-[11px] text-gray-500">
              Relative growth of different complexities as input size \(n\)
              increases. The detected complexity is highlighted.
            </p>
            <ResponsiveContainer width="100%" height={140}>
              <LineChart data={normalizedComplexityData}>
                <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" />
                <XAxis
                  dataKey="n"
                  stroke="#9ca3af"
                  tick={{ fontSize: 10 }}
                />
                <YAxis
                  stroke="#9ca3af"
                  tick={{ fontSize: 10 }}
                  ticks={[0, 0.25, 0.5, 0.75, 1]}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#111827",
                    border: "1px solid #374151",
                    borderRadius: 4,
                    color: "#e5e7eb",
                    fontSize: 11,
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: 10, color: "#9ca3af" }}
                />
                <Line
                  type="monotone"
                  dataKey="O(log n)"
                  stroke={isLogN ? "#34d399" : "#4b5563"}
                  strokeWidth={isLogN ? 2.5 : 1.5}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="O(n)"
                  stroke={isN ? "#22c55e" : "#6b7280"}
                  strokeWidth={isN ? 2.5 : 1.5}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="O(n log n)"
                  stroke={isNLogN ? "#f97316" : "#6b7280"}
                  strokeWidth={isNLogN ? 2.5 : 1.5}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="O(n^2)"
                  stroke={isN2 ? "#ef4444" : "#6b7280"}
                  strokeWidth={isN2 ? 2.5 : 1.5}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    );
  };

  const renderEdgeCasesTab = () => {
    return (
      <div className="flex h-full flex-col gap-3">
        <div>
          <button
            type="button"
            onClick={onGenerateEdgeCases}
            disabled={!onGenerateEdgeCases || isGeneratingEdgeCases}
            className="rounded border border-amber-600 bg-transparent px-3 py-1.5 text-xs font-medium text-amber-400 transition-colors hover:bg-amber-600/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isGeneratingEdgeCases ? "Generating edge cases..." : "Generate Edge Cases"}
          </button>
        </div>
        <div className="flex-1 overflow-auto">
          {edgeCases ? (
            <pre className="whitespace-pre-wrap break-words text-gray-400">
              {edgeCases}
            </pre>
          ) : (
            <p className="text-gray-600">
              Generated edge test cases for the current problem will appear
              here.
            </p>
          )}
        </div>
      </div>
    );
  };

  const renderVisualizerTab = () => {
    return (
      <div className="flex h-full min-h-0 flex-col gap-3">
        <div className="shrink-0 flex items-center justify-between">
          <button
            type="button"
            onClick={onVisualizeAlgorithm}
            disabled={!onVisualizeAlgorithm || isVisualizing}
            className="rounded border border-violet-600 bg-transparent px-3 py-1.5 text-xs font-medium text-violet-300 transition-colors hover:bg-violet-600/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isVisualizing ? "Visualizing..." : "Visualize Algorithm"}
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-auto rounded border border-[#333] bg-[#111827] p-3 flex flex-col gap-4">
          {!visualizerData && !isVisualizing && (
            <p className="text-gray-600">
              Click &quot;Visualize Algorithm&quot; to generate an algorithm breakdown.
            </p>
          )}
          {isVisualizing && <p className="text-gray-500">Detecting pattern and steps...</p>}
          
          {visualizerData && visualizerData.steps && visualizerData.steps.length > 0 && (
            <>
              <div>
                <span className="text-xs font-semibold text-gray-400">Pattern Detected: </span>
                <span className="text-sm font-bold text-violet-400">{visualizerData.pattern}</span>
              </div>
              
              <div className="flex-1 overflow-auto flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">
                    Step {currentStepIndex + 1} / {visualizerData.steps.length}
                  </span>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => { setIsAutoPlaying(false); setCurrentStepIndex(Math.max(0, currentStepIndex - 1)); }}
                      disabled={currentStepIndex === 0}
                      className="rounded bg-[#1f2937] px-2 py-1 text-xs text-gray-300 hover:bg-[#374151] disabled:opacity-50"
                    >
                      Prev
                    </button>
                    <button 
                      onClick={() => setIsAutoPlaying(!isAutoPlaying)}
                      disabled={currentStepIndex >= visualizerData.steps.length - 1}
                      className="rounded bg-violet-600/20 px-2 py-1 text-xs text-violet-300 hover:bg-violet-600/40 border border-violet-600/50 disabled:opacity-50"
                    >
                      {isAutoPlaying ? "Pause" : "Auto Play"}
                    </button>
                    <button 
                      onClick={() => { setIsAutoPlaying(false); setCurrentStepIndex(Math.min(visualizerData.steps.length - 1, currentStepIndex + 1)); }}
                      disabled={currentStepIndex >= visualizerData.steps.length - 1}
                      className="rounded bg-[#1f2937] px-2 py-1 text-xs text-gray-300 hover:bg-[#374151] disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
                
                <div className="mt-2 text-sm text-gray-200 p-4 bg-[#1f2937] rounded border border-[#374151] min-h-[100px] flex flex-col items-center justify-center text-center gap-6">
                  <div>{visualizerData.steps[currentStepIndex]?.explanation}</div>
                  
                  {/* Array and Pointers Visualization */}
                  {visualizerData.steps[currentStepIndex]?.array && (
                    <div className="relative mt-4 mb-8 flex gap-1">
                      <AnimatePresence mode="popLayout">
                        {visualizerData.steps[currentStepIndex].array?.map((val, idx) => {
                          const isITarget = visualizerData.steps[currentStepIndex].i === idx;
                          const isJTarget = visualizerData.steps[currentStepIndex].j === idx;
                          
                          return (
                            <motion.div 
                              key={`cell-${idx}`}
                              layout
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ duration: 0.3 }}
                              className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded border border-[#4b5563] bg-[#111827] text-white"
                            >
                              {val}
                              
                              {/* Pointer i */}
                              {isITarget && (
                                <motion.div 
                                  layoutId="pointer-i"
                                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                                  className="absolute -bottom-7 flex flex-col items-center text-emerald-400"
                                >
                                  <span className="text-[10px] leading-none mb-0.5">↑</span>
                                  <span className="text-[10px] font-bold leading-none">i</span>
                                </motion.div>
                              )}
                              
                              {/* Pointer j */}
                              {isJTarget && (
                                <motion.div 
                                  layoutId="pointer-j"
                                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                                  className="absolute -bottom-7 flex flex-col items-center text-sky-400"
                                  style={{
                                    // Offset horizontally if i and j are on the same index
                                    marginLeft: isITarget && isJTarget ? "24px" : "0"
                                  }}
                                >
                                  <span className="text-[10px] leading-none mb-0.5">↑</span>
                                  <span className="text-[10px] font-bold leading-none">j</span>
                                </motion.div>
                              )}
                            </motion.div>
                          );
                        })}
                      </AnimatePresence>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-full flex-col bg-[#1e1e1e] text-gray-300">
      {/* Tabs */}
      <div className="flex items-center justify-between border-b border-[#333] px-4 py-2">
        <div className="flex flex-wrap gap-2 text-xs font-medium">
          <button
            type="button"
            onClick={() => setActiveTab("console")}
            className={`pb-1 ${
              activeTab === "console"
                ? "border-b-2 border-emerald-500 text-emerald-400"
                : "text-gray-500 hover:text-gray-300"
            }`}
          >
            Console
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("ai")}
            className={`pb-1 ${
              activeTab === "ai"
                ? "border-b-2 border-amber-500 text-amber-400"
                : "text-gray-500 hover:text-gray-300"
            }`}
          >
            AI Feedback
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("edges")}
            className={`pb-1 ${
              activeTab === "edges"
                ? "border-b-2 border-sky-500 text-sky-400"
                : "text-gray-500 hover:text-gray-300"
            }`}
          >
            Edge Cases
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("visualizer")}
            className={`pb-1 ${
              activeTab === "visualizer"
                ? "border-b-2 border-violet-500 text-violet-400"
                : "text-gray-500 hover:text-gray-300"
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
      <div className="flex-1 overflow-auto p-4 font-mono text-sm">
        {activeTab === "console" && renderConsoleTab()}
        {activeTab === "ai" && renderAiFeedbackTab()}
        {activeTab === "edges" && renderEdgeCasesTab()}
        {activeTab === "visualizer" && renderVisualizerTab()}
      </div>
    </div>
  );
}
