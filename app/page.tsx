"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Panel, Group, Separator, PanelImperativeHandle } from "react-resizable-panels";
import ProblemPanel, { defaultProblem } from "@/components/ProblemPanel";
import CodeEditor, { type EditorLanguage } from "@/components/CodeEditor";
import ConsoleOutput, { type TestResult } from "@/components/ConsoleOutput";
import AiMentorChat from "@/components/AiMentorChat";
import InterviewMode from "@/components/InterviewMode";
import { useInterview } from "@/hooks/useInterview";


export type FlowchartData = {
  mermaid: string;
  explanation: string;
};

export type CodeAnalysisReport = {
  simulationResults: {
    id: number;
    status: string;
    input: string;
    expected: string;
    actual: string;
  }[];
  analysis: {
    pattern: { name: string; confidence: number };
    complexity: { time: string; space: string };
    quality: { score: number; issues: string[] };
    wrongApproach?: { detected: boolean; issue?: string; suggestion?: string };
  };
};

// Generic starter code stubs shown before a problem is imported
const genericStarterStubs: Record<EditorLanguage, string> = {
  c:          `void solution() {
    // TODO: implement
}`,
  cpp:        `class Solution {
public:
    void solution() {
        // TODO: implement
    }
};`,
  java:       `class Solution {
    public void solution() {
        // TODO: implement
    }
}`,
  python:     `def solution():
    # TODO: implement
    pass`,
  python3:    `def solution():
    # TODO: implement
    pass`,
  javascript: `function solution() {
    // TODO: implement
}`,
  typescript: `function solution(): void {
    // TODO: implement
}`,
  csharp:     `public class Solution {
    public void SolutionMethod() {
        // TODO: implement
    }
}`,
};

export default function Home() {
  const [language, setLanguage] = useState<EditorLanguage>("python");
  const [code, setCode] = useState(() => genericStarterStubs["python"]);
  const [consoleOutput, setConsoleOutput] = useState("");
  const [aiFeedback, setAiFeedback] = useState("");
  const [edgeCasesOutput, setEdgeCasesOutput] = useState("");
  const [detectedComplexity, setDetectedComplexity] = useState("");
  const [showComplexityGraph, setShowComplexityGraph] = useState(false);
  const [leftComplexityDetected, setLeftComplexityDetected] = useState("");
  const [showLeftComplexityGraph, setShowLeftComplexityGraph] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [codeAnalysis, setCodeAnalysis] = useState<CodeAnalysisReport["analysis"] | null>(null);
  const [complexityReport, setComplexityReport] = useState("");
  const [isAnalyzingComplexity, setIsAnalyzingComplexity] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isGeneratingEdgeCases, setIsGeneratingEdgeCases] = useState(false);
  const [flowchartData, setFlowchartData] = useState<FlowchartData | null>(null);
  const [isGeneratingFlowchart, setIsGeneratingFlowchart] = useState(false);
  const [isDebugging, setIsDebugging] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isHinting, setIsHinting] = useState(false);
  const [activeTab, setActiveTab] = useState<"console" | "ai" | "edges">("console");
  const [leftPanelTab, setLeftPanelTab] = useState<"problem" | "visualizer" | "complexity">("problem");
  const [maximizedPanel, setMaximizedPanel] = useState<"question" | "editor" | "terminal" | null>(null);
  const toggleMaximizePanel = useCallback((panel: "question" | "editor" | "terminal") => {
    setMaximizedPanel((prev) => (prev === panel ? null : panel));
  }, []);
  const [problemMeta, setProblemMeta] = useState(() => ({
    title: "",
    description: "",
    constraints: [] as string[],
    examples: [] as Array<{ input: string; output: string }>,
  }));
  // starterCode holds problem-specific stubs after import; falls back to genericStarterStubs
  const [starterCode, setStarterCode] = useState<Record<EditorLanguage, string>>(() => ({ ...genericStarterStubs }));
  const [isConsoleExpanded, setIsConsoleExpanded] = useState(true);
  const consolePanelRef = useRef<PanelImperativeHandle>(null);

  const interview = useInterview();

  const expandConsole = useCallback(() => {
    setMaximizedPanel(null);
    requestAnimationFrame(() => {
      if (!consolePanelRef.current) return;

      if (consolePanelRef.current.isCollapsed()) {
        consolePanelRef.current.expand();
      }

      consolePanelRef.current.resize(35);

      setIsConsoleExpanded(true);
    });
  }, []);

  const toggleConsole = useCallback(() => {
    if (!consolePanelRef.current) return;

    if (consolePanelRef.current.isCollapsed()) {
      consolePanelRef.current.expand();
      consolePanelRef.current.resize(35);
      setIsConsoleExpanded(true);
    } else {
      consolePanelRef.current.collapse();
      setIsConsoleExpanded(false);
    }
  }, []);

  // Derived: whether a problem has been imported/loaded
  const isProblemLoaded = !!problemMeta.title;

  // Derived: streak is ON when all test cases passed
  const isStreakOn = testResults.length > 0 && testResults.every((r) => r.status === "pass");

  useEffect(() => {
    try {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key && (key.includes("react-resizable-panels") || key.includes("layout"))) {
          localStorage.removeItem(key);
        }
      }
    } catch (e) {
      console.warn("Could not clear layout cache from localStorage:", e);
    }
  }, []);

  const handleLanguageChange = useCallback((lang: EditorLanguage) => {
    setLanguage(lang);
    // Use problem-specific starter if available, else fall back to generic stubs
    const snippet = starterCode[lang] || genericStarterStubs[lang] || "";
    setCode(snippet);
    setConsoleOutput("");
    setAiFeedback("");
    setEdgeCasesOutput("");
    setTestResults([]);
    setDetectedComplexity("");
    setComplexityReport("");
    setShowComplexityGraph(false);
    setLeftComplexityDetected("");
    setShowLeftComplexityGraph(false);
  }, [starterCode]);

  const handleRunCode = useCallback(async () => {
    if (!isProblemLoaded) {
      setConsoleOutput("Please write code or import a problem before running.");
      setActiveTab("console");
      expandConsole();
      return;
    }
    const examples = problemMeta.examples ?? [];
    if (examples.length === 0) {
      setConsoleOutput(
        "No example test cases. Import a problem with examples first, or add examples in the problem description."
      );
      setTestResults([]);
      return;
    }

    setIsRunning(true);
    setConsoleOutput("");
    setTestResults([]);
    setAiFeedback("");
    setCodeAnalysis(null);
    setActiveTab("console");
    expandConsole();

    try {
      const res = await fetch("/api/code-intelligence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          problem: problemMeta.description,
          code,
          language,
          examples: examples.map(ex => ({ input: ex.input, output: ex.output }))
        }),
      });

      if (!res.ok) {
        setConsoleOutput("Analysis or Simulation failed. Please try again.");
        return;
      }

      const data = (await res.json()) as CodeAnalysisReport;
      
      // Map AI simulation results to our TestResult type
      const results: TestResult[] = (data.simulationResults || []).map((res) => ({
        id: res.id,
        status: res.status as "pass" | "fail",
        input: res.input,
        expectedOutput: res.expected,
        actualOutput: res.actual
      }));

      setTestResults(results);
      setCodeAnalysis(data.analysis);

      // Populate visible console output string
      let summaryText = `[EXECUTION SUMMARY]\n`;
      let passedCount = 0;
      results.forEach(r => {
        if (r.status === "pass") passedCount++;
        summaryText += `\n▶ Test Case ${r.id} | Status: ${r.status.toUpperCase()}\n  Input:    ${r.input}\n  Expected: ${r.expectedOutput}\n  Actual:   ${r.actualOutput}\n`;
      });
      summaryText += `\nResult: ${passedCount} / ${results.length} Test Cases Passed.`;
      
      setConsoleOutput(summaryText);

      // Update complexity state for the graph if present
      const complexityText = data.analysis.complexity.time;
      const lower = complexityText.toLowerCase();
      if (lower.includes("o(log n)") || lower.includes("log n")) {
        setDetectedComplexity("O(log n)");
      } else if (lower.includes("o(n log n)") || lower.includes("n log n")) {
        setDetectedComplexity("O(n log n)");
      } else if (lower.includes("o(n^2)") || lower.includes("o(n2)") || lower.includes("n^2")) {
        setDetectedComplexity("O(n^2)");
      } else if (lower.includes("o(n)")) {
        setDetectedComplexity("O(n)");
      } else {
        setDetectedComplexity("");
      }
      setShowComplexityGraph(true);

    } catch (err) {
      console.error("[handleRunCode] Error:", err);
      setConsoleOutput(
        "Analysis service error. Check your connection and try again."
      );
    } finally {
      setIsRunning(false);
    }
  }, [language, code, problemMeta.description, problemMeta.examples, isProblemLoaded]);

  const handleGetHint = useCallback(async () => {
    if (!isProblemLoaded) {
      setAiFeedback("## AI Hint\n\nIf no problem is loaded, please import or paste a problem first so Lucy can guide you.");
      setActiveTab("ai");
      expandConsole();
      return;
    }
    setTestResults([]);
    setAiFeedback("");
    setShowComplexityGraph(false);
    setActiveTab("ai");
    setIsHinting(true);
    expandConsole();

    try {
      const res = await fetch("/api/ai-hint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          problem: problemMeta.description,
          code,
          language,
        }),
      });

      if (!res.ok) {
        setAiFeedback(
          "## AI Hint\n⚠️ Could not generate AI hint. Please try again."
        );
        return;
      }

      const data = await res.json();
      const hint =
        (data?.hint as string | undefined) ||
        "⚠️ Could not generate AI hint. Please try again.";
      setAiFeedback(`## AI Hint\n\n${hint}`);
    } catch (err) {
      console.error("[handleGetHint] Error:", err);
      setAiFeedback(
        "## AI Hint\n⚠️ Could not generate AI hint. Please check your connection and try again."
      );
    } finally {
      setIsHinting(false);
    }
  }, [problemMeta.description, code, language, isProblemLoaded]);

  const handleAnalyzeCode = useCallback(async () => {
    if (!isProblemLoaded) {
      setAiFeedback("## Analyze Report\n\nCode analysis requires a problem or implemented logic. Please import a problem first.");
      setActiveTab("ai");
      expandConsole();
      return;
    }
    setTestResults([]);
    setAiFeedback("");
    setShowComplexityGraph(false);
    setActiveTab("ai");
    setIsAnalyzing(true);
    expandConsole();

    try {
      const res = await fetch("/api/analyze-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          problem: problemMeta.description,
          code,
          language,
        }),
      });

      if (!res.ok) {
        setAiFeedback(
          "## Analyze Report\n⚠️ Could not analyze your code. Please try again."
        );
        return;
      }

      const data = await res.json();
      const analysis =
        (data?.analysis as string | undefined) ||
        "⚠️ Could not analyze your code. Please try again.";
      setAiFeedback(`## Analyze Report\n\n${analysis}`);
    } catch (err) {
      console.error("[handleAnalyzeCode] Error:", err);
      setAiFeedback(
        "## Analyze Report\n⚠️ Could not analyze your code. Please check your connection and try again."
      );
    } finally {
      setIsAnalyzing(false);
    }
  }, [problemMeta.description, code, language, isProblemLoaded]);

  const handleDebugCode = useCallback(async () => {
    if (!isProblemLoaded) {
      setAiFeedback("## Debug Report\n\nDebug requires a problem to be loaded. Please import a problem first.");
      setActiveTab("ai");
      expandConsole();
      return;
    }
    setTestResults([]);
    setAiFeedback("");
    setShowComplexityGraph(false);
    setActiveTab("ai");
    setIsDebugging(true);
    expandConsole();

    try {
      const res = await fetch("/api/debug-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          problem: problemMeta.description,
          code,
          language,
        }),
      });

      if (!res.ok) {
        setAiFeedback(
          "## Debug Report\n⚠️ Could not debug your code. Please try again."
        );
        return;
      }

      const data = await res.json();
      const debugInfo =
        (data?.debugInfo as string | undefined) ||
        "⚠️ Could not debug your code. Please try again.";
      setAiFeedback(`## Debug Report\n\n${debugInfo}`);
    } catch (err) {
      console.error("[handleDebugCode] Error:", err);
      setAiFeedback(
        "## Debug Report\n⚠️ Could not debug your code. Please check your connection and try again."
      );
    } finally {
      setIsDebugging(false);
    }
  }, [problemMeta.description, code, language, isProblemLoaded]);

  const handleTimeComplexity = useCallback(async () => {
    if (!isProblemLoaded) {
      setComplexityReport("Complexity analysis will appear once code is written and a problem is loaded.");
      setLeftPanelTab("complexity");
      return;
    }
    setIsAnalyzingComplexity(true);
    setComplexityReport("");
    setLeftPanelTab("complexity");

    try {
      const res = await fetch("/api/time-complexity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          problem: problemMeta.description,
          code,
          language,
        }),
      });

      if (!res.ok) {
        setComplexityReport("⚠️ Could not analyze time complexity. Please try again.");
        return;
      }

      const data = await res.json();
      setComplexityReport(data);

      const timeValue = data.time.value.toLowerCase();
      if (timeValue.includes("o(log n)") || timeValue.includes("log n")) {
        setLeftComplexityDetected("O(log n)");
      } else if (timeValue.includes("o(n log n)") || timeValue.includes("n log n")) {
        setLeftComplexityDetected("O(n log n)");
      } else if (timeValue.includes("o(n^2)") || timeValue.includes("o(n2)") || timeValue.includes("n^2")) {
        setLeftComplexityDetected("O(n^2)");
      } else if (timeValue.includes("o(n)")) {
        setLeftComplexityDetected("O(n)");
      } else {
        setLeftComplexityDetected("");
      }
      setShowLeftComplexityGraph(true);
    } catch (err) {
      console.error("[handleTimeComplexity] Error:", err);
      setComplexityReport({
        time: { value: "O(?)", explanation: "Error", reasoning: "Could not analyze", optimalSuggestion: "N/A", isOptimal: true },
        space: { value: "O(?)", explanation: "Error", reasoning: "Could not analyze", optimalSuggestion: "N/A", isOptimal: true }
      } as any);
      setLeftComplexityDetected("");
      setShowLeftComplexityGraph(false);
    } finally {
      setIsAnalyzingComplexity(false);
    }
  }, [problemMeta.description, code, language, isProblemLoaded]);

  const handleImportProblem = useCallback(
    async (problemText: string) => {
      setIsImporting(true);
      setConsoleOutput("Parsing problem...");
      setTestResults([]);

      try {
        const res = await fetch("/api/import-problem", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ problemText }),
        });

        if (!res.ok) {
          setConsoleOutput(
            "⚠️ Could not parse the problem. Please check formatting."
          );
          return;
        }

        const data = await res.json();

        const nextProblem = {
          title: data.title ?? "",
          description: data.description ?? "",
          constraints: data.constraints ?? [],
          examples: data.examples ?? [],
        };

        const nextStarter: Record<EditorLanguage, string> = {
          c:          data.starter_code?.c          || genericStarterStubs.c,
          cpp:        data.starter_code?.cpp        || genericStarterStubs.cpp,
          java:       data.starter_code?.java       || genericStarterStubs.java,
          python:     data.starter_code?.python     || genericStarterStubs.python,
          python3:    data.starter_code?.python3    || data.starter_code?.python || genericStarterStubs.python3,
          javascript: data.starter_code?.javascript || genericStarterStubs.javascript,
          typescript: data.starter_code?.typescript || genericStarterStubs.typescript,
          csharp:     data.starter_code?.csharp     || genericStarterStubs.csharp,
        };

        setProblemMeta(nextProblem);
        setStarterCode(nextStarter);

        setCode(
          (nextStarter[
            language as keyof typeof nextStarter
          ] as string) ?? code
        );

        setConsoleOutput("");
        setDetectedComplexity("");
        setShowComplexityGraph(false);
      } catch (err) {
        console.error("[handleImportProblem] Error:", err);
        setConsoleOutput(
          "⚠️ Could not parse the problem. Please check formatting."
        );
      } finally {
        setIsImporting(false);
      }
    },
    [language, code]
  );

  const handleGenerateEdgeCases = useCallback(async () => {
    if (!isProblemLoaded) {
      setEdgeCasesOutput("Edge cases require a problem to be loaded. Please import a problem first.");
      setActiveTab("edges");
      expandConsole();
      return;
    }
    setIsGeneratingEdgeCases(true);
    setEdgeCasesOutput("Generating edge cases...");
    setActiveTab("edges");
    expandConsole();

    try {
      const res = await fetch("/api/edge-cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          problem: problemMeta.description,
          code,
          language,
        }),
      });

      if (!res.ok) {
        setEdgeCasesOutput(
          "⚠️ Could not generate edge cases. Please try again."
        );
        return;
      }

      const data = await res.json();
      const casesText =
        (data?.edgeCases as string | undefined) ||
        "⚠️ Could not generate edge cases. Please try again.";
      setEdgeCasesOutput(casesText);
    } catch (err) {
      console.error("[handleGenerateEdgeCases] Error:", err);
      setEdgeCasesOutput(
        "⚠️ Could not generate edge cases. Please check your connection and try again."
      );
    } finally {
      setIsGeneratingEdgeCases(false);
    }
  }, [problemMeta.description, code, language, isProblemLoaded]);

  const handleGenerateFlowchart = useCallback(async () => {
    if (!isProblemLoaded) {
      setLeftPanelTab("visualizer");
      // FlowchartData null means the placeholder is shown automatically
      return;
    }
    setIsGeneratingFlowchart(true);
    setFlowchartData(null);
    setLeftPanelTab("visualizer");

    try {
      const res = await fetch("/api/flowchart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          problem: problemMeta.description,
          code,
          language 
        }),
      });

      if (!res.ok) {
        setFlowchartData(null);
        return;
      }

      const data = await res.json();
      setFlowchartData({
        mermaid: data.mermaid || "Error",
        explanation: data.explanation || "No explanation found.",
      });
    } catch (err) {
      console.error("[handleGenerateFlowchart] Error:", err);
      setFlowchartData(null);
    } finally {
      setIsGeneratingFlowchart(false);
    }
  }, [problemMeta.description, code, language, isProblemLoaded]);

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Header */}
      <header className="relative flex h-[60px] shrink-0 items-center justify-between border-b border-[#2a2a2a]/40 bg-gradient-to-b from-[#1e1e1e] to-[#141414] px-5 shadow-sm">
        {/* Left: Brand & Navigation */}
        <div className="flex items-center h-full flex-1 justify-start">
          <div className="flex items-center justify-center pl-2 mr-8 h-full">
            <img src="/lucy.png" alt="Lucy AI Logo" className="w-9 h-9 object-contain hover:opacity-80 transition-opacity cursor-pointer" />
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center h-full gap-8">
            {[
              { id: "problem", label: "Problem" },
              { id: "visualizer", label: "Visualizer" },
              { id: "complexity", label: "Complexity" }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setLeftPanelTab(tab.id as any)}
                className={`relative h-full flex items-center text-[14px] font-medium tracking-wide transition-all ${
                  leftPanelTab === tab.id ? "text-white" : "text-neutral-400 hover:text-slate-200"
                }`}
              >
                {tab.label}
                {leftPanelTab === tab.id && (
                  <motion.div
                    layoutId="activeHeaderTab"
                    className="absolute bottom-0 left-0 right-0 h-[2px] bg-white rounded-t-full shadow-[0_-2px_8px_rgba(255,255,255,0.2)]"
                  />
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Center: Action Toolbar */}
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center h-[42px] rounded-xl bg-[#252526]/80 backdrop-blur-md border border-[#3a3a3a]/60 shadow-sm p-1.5 gap-1.5">
          {/* LEFT GROUP */}
          <div className="flex items-center gap-1.5 pr-1.5">
            <button
              onClick={handleRunCode}
              disabled={isRunning}
              className="flex items-center justify-center h-[28px] rounded-md bg-emerald-600/15 px-4 text-[13px] font-bold text-emerald-400 transition-colors hover:bg-emerald-600/25 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isRunning ? "Running..." : "Run Code"}
            </button>
          </div>

          <div className="w-[1px] h-5 bg-[#4a4a4a] mx-1" />

          {/* CENTER GROUP */}
          <div className="flex items-center gap-1 pl-1.5 pr-0.5">
            <button
              onClick={handleGetHint}
              className="flex items-center justify-center h-[28px] rounded-md px-3 text-[13px] font-bold text-neutral-300 transition-all hover:bg-[#3a3a3a] hover:text-white"
            >
              AI Hint
            </button>
            <button
              onClick={handleAnalyzeCode}
              disabled={isDebugging || isRunning}
              className="flex items-center justify-center h-[28px] rounded-md px-3 text-[13px] font-bold text-neutral-300 transition-all hover:bg-[#3a3a3a] hover:text-white disabled:opacity-50"
            >
              Analyze
            </button>
            <button
              onClick={handleDebugCode}
              disabled={isDebugging || isRunning}
              className="flex items-center justify-center h-[28px] rounded-md bg-[#3a3a3a] px-3 text-[13px] font-bold text-blue-400 transition-all hover:bg-[#4a4a4a] disabled:opacity-50"
            >
              {isDebugging ? "Debugging..." : "Debug"}
            </button>
          </div>
        </div>

        {/* Right: Interview Mode */}
        <div className="flex items-center flex-1 justify-end gap-4">
          {/* Streak icon */}
          <div 
            className="flex items-center justify-center cursor-default"
            title={isStreakOn ? "🔥 All tests passed!" : "Run code to light your streak!"}
          >
            <img
              key={isStreakOn ? "on" : "off"}
              src={isStreakOn ? "/streak-on.png" : "/streak-off.png"}
              alt={isStreakOn ? "Streak active" : "Streak inactive"}
              className="h-[20px] w-[20px] object-contain"
            />
          </div>

          <button
            onClick={() => interview.isInterviewActive ? interview.exitInterview() : interview.openInterview()}
            disabled={!isProblemLoaded}
            title={!isProblemLoaded ? "Load a problem first" : "Start a 25-minute mock interview"}
            className="flex items-center justify-center h-[28px] gap-2 rounded-md bg-[#2a2a2a] px-4 text-[13px] font-bold text-neutral-300 border border-[#3a3a3a] hover:bg-[#3a3a3a] transition-colors disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 mt-0.5"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 mt-0.5"></span>
            </span>
            Start Interview
          </button>
        </div>
      </header>

      {/* Main Resizable Layout */}
      <div className="min-h-0 flex-1 overflow-hidden p-2 bg-[#0a0a0a] flex">
        {maximizedPanel === "editor" ? (
          <div className="flex-1 h-full bg-[#1e1e1e] rounded-xl border border-[#2a2a2a] shadow-sm flex flex-col overflow-hidden">
            <div className="flex shrink-0 items-center justify-between border-b border-[#2a2a2a] bg-[#1e1e1e] px-4 h-[36px]">
              <select
                value={language}
                onChange={(e) =>
                  handleLanguageChange(e.target.value as EditorLanguage)
                }
                className="min-w-[120px] shrink-0 rounded bg-[#2a2a2a] border border-[#3a3a3a] px-2 py-0.5 text-[11px] font-medium text-neutral-300 outline-none transition-colors hover:bg-[#333333] hover:text-white"
              >
                <option value="c">C</option>
                <option value="cpp">C++</option>
                <option value="java">Java</option>
                <option value="python">Python</option>
                <option value="python3">Python3</option>
                <option value="javascript">JavaScript</option>
                <option value="typescript">TypeScript</option>
                <option value="csharp">C#</option>
              </select>
              <button
                onClick={() => toggleMaximizePanel("editor")}
                className="flex items-center justify-center h-6 w-6 rounded hover:bg-[#333] transition-colors text-neutral-400 hover:text-white"
                title="Exit Fullscreen"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 14h6v6M20 10h-6V4M14 10l7-7M10 14l-7 7"/></svg>
              </button>
            </div>
            <div className="flex-1 min-h-0 overflow-hidden">
              <CodeEditor
                value={code}
                onChange={setCode}
                language={language}
                height="100%"
              />
            </div>
          </div>
        ) : maximizedPanel === "terminal" ? (
          <div className="flex-1 h-full bg-[#1e1e1e] rounded-xl border border-[#2a2a2a] shadow-sm flex flex-col overflow-hidden">
            <div className="flex-1 min-h-0 overflow-hidden">
              <ConsoleOutput
                isExpanded={true}
                onToggleExpand={undefined}
                isFullscreenMode={true}
                onToggleFullscreen={() => toggleMaximizePanel("terminal")}
                consoleOutput={consoleOutput}
                aiFeedback={aiFeedback}
                edgeCases={edgeCasesOutput}
                detectedComplexity={detectedComplexity}
                showComplexityGraph={showComplexityGraph}
                testResults={testResults}
                isRunning={isRunning}
                isAnalyzing={isAnalyzing}
                isDebugging={isDebugging}
                isHinting={isHinting}
                problemDescription={problemMeta.description}
                userCode={code}
                onGenerateEdgeCases={handleGenerateEdgeCases}
                isGeneratingEdgeCases={isGeneratingEdgeCases}
                flowchartData={flowchartData}
                isGeneratingFlowchart={isGeneratingFlowchart}
                codeAnalysis={codeAnalysis}
                activeTab={activeTab}
                onActiveTabChange={setActiveTab}
              />
            </div>
          </div>
        ) : (
          <Group orientation="horizontal">
            {/* Left Panel - Problem */}
            <Panel defaultSize={40} minSize={20} className="bg-[#1e1e1e] rounded-xl border border-[#2a2a2a] shadow-sm flex flex-col overflow-hidden">
              <div className="flex-1 min-h-0 overflow-hidden">
                <ProblemPanel
                  title={problemMeta.title}
                  description={problemMeta.description}
                  constraints={problemMeta.constraints}
                  examples={problemMeta.examples}
                  onImportProblem={handleImportProblem}
                  isImporting={isImporting}
                  activeTab={leftPanelTab}
                  onActiveTabChange={setLeftPanelTab}
                  detectedComplexity={leftComplexityDetected}
                  showComplexityGraph={showLeftComplexityGraph}
                  flowchartData={flowchartData}
                  isGeneratingFlowchart={isGeneratingFlowchart}
                  onGenerateFlowchart={handleGenerateFlowchart}
                  onTimeComplexity={handleTimeComplexity}
                  codeAnalysis={codeAnalysis}
                  complexityReport={complexityReport}
                  isAnalyzingComplexity={isAnalyzingComplexity}
                />
              </div>
            </Panel>

            {/* Vertical Resize Handle */}
            <Separator className="w-2 bg-transparent transition-all hover:bg-neutral-800 active:bg-neutral-700 cursor-col-resize shrink-0 mx-1 rounded" />

            {/* Right Panel - Editor & Console */}
            <Panel defaultSize={60} minSize={30} className="flex flex-col bg-transparent overflow-hidden">
              <Group orientation="vertical">
                {/* Right Top Panel - Editor */}
                <Panel defaultSize={75} minSize={20} className="bg-[#1e1e1e] rounded-xl border border-[#2a2a2a] shadow-sm flex flex-col overflow-hidden">
                  {/* Editor Header for Language Selection */}
                  <div className="flex shrink-0 items-center justify-between border-b border-[#2a2a2a] bg-[#1e1e1e] px-4 h-[36px]">
                    <select
                      value={language}
                      onChange={(e) =>
                        handleLanguageChange(e.target.value as EditorLanguage)
                      }
                      className="min-w-[120px] shrink-0 rounded bg-[#2a2a2a] border border-[#3a3a3a] px-2 py-0.5 text-[11px] font-medium text-neutral-300 outline-none transition-colors hover:bg-[#333333] hover:text-white"
                    >
                      <option value="c">C</option>
                      <option value="cpp">C++</option>
                      <option value="java">Java</option>
                      <option value="python">Python</option>
                      <option value="python3">Python3</option>
                      <option value="javascript">JavaScript</option>
                      <option value="typescript">TypeScript</option>
                      <option value="csharp">C#</option>
                    </select>
                    <button
                      onClick={() => toggleMaximizePanel("editor")}
                      className="flex items-center justify-center h-6 w-6 rounded hover:bg-[#333] transition-colors text-neutral-400 hover:text-white"
                      title="Fullscreen"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
                    </button>
                  </div>
                  <div className="flex-1 min-h-0 overflow-hidden">
                    <CodeEditor
                      value={code}
                      onChange={setCode}
                      language={language}
                      height="100%"
                    />
                  </div>
                </Panel>

                {/* Horizontal Resize Handle */}
                <Separator className="h-2 bg-transparent transition-all hover:bg-neutral-800 active:bg-neutral-700 cursor-row-resize shrink-0 my-1 rounded" />

                {/* Right Bottom Panel - Console */}
                <Panel 
                  panelRef={consolePanelRef} 
                  defaultSize={25} 
                  minSize={15} 
                  collapsible={true}
                  collapsedSize={0}
                  onResize={(size) => {
                    const percentage =
                      typeof size === "number"
                        ? size
                        : size?.asPercentage ?? 0;

                    setIsConsoleExpanded(percentage > 10);
                  }}
                  className="bg-[#1e1e1e] rounded-xl border border-[#2a2a2a] shadow-sm flex flex-col overflow-hidden h-full min-h-0"
                >
                  <ConsoleOutput
                    isExpanded={isConsoleExpanded}
                    onToggleExpand={toggleConsole}
                    isFullscreenMode={false}
                    onToggleFullscreen={() => toggleMaximizePanel("terminal")}
                    consoleOutput={consoleOutput}
                    aiFeedback={aiFeedback}
                    edgeCases={edgeCasesOutput}
                    detectedComplexity={detectedComplexity}
                    showComplexityGraph={showComplexityGraph}
                    testResults={testResults}
                    isRunning={isRunning}
                    isAnalyzing={isAnalyzing}
                    isDebugging={isDebugging}
                    isHinting={isHinting}
                    problemDescription={problemMeta.description}
                    userCode={code}
                    onGenerateEdgeCases={handleGenerateEdgeCases}
                    isGeneratingEdgeCases={isGeneratingEdgeCases}
                    flowchartData={flowchartData}
                    isGeneratingFlowchart={isGeneratingFlowchart}
                    codeAnalysis={codeAnalysis}
                    activeTab={activeTab}
                    onActiveTabChange={setActiveTab}
                  />
                </Panel>
              </Group>
            </Panel>
          </Group>
        )}
      </div>

      {/* Floating AI Mentor Chat */}
      <AiMentorChat
        problem={problemMeta.description}
        code={code}
        language={language}
        isProblemLoaded={isProblemLoaded}
      />

      {/* Conditionally Render Interview Mode Full Screen */}
      {(interview.isInterviewActive || interview.showReport) && (
        <InterviewMode
          problemMeta={problemMeta}
          code={code}
          setCode={setCode}
          language={language}
          setLanguage={handleLanguageChange}
          onExit={interview.exitInterview}
          isProblemLoaded={isProblemLoaded}
          sessionId={interview.sessionId}
          phase={interview.phase}
          messages={interview.messages}
          isLoading={interview.isLoading}
          timeLeft={interview.timeLeft}
          onStart={(diff, personality) => interview.startInterview({
            problemTitle: problemMeta.title,
            problemDescription: problemMeta.description,
            difficulty: diff.toLowerCase().includes("faang") ? "hard" : 
                       diff.toLowerCase().includes("advanced") ? "hard" :
                       diff.toLowerCase().includes("intermediate") ? "medium" : "easy",
            interviewerPersonality: personality as any
          })}
          onSendMessage={interview.sendMessage}
          onSubmitCode={() => interview.submitCode(code, language)}
          onEnd={interview.endInterview}
          evaluation={interview.evaluation}
          evaluationState={interview.evaluationState}
          evidence={interview.evidence}
          isExpired={interview.isExpired}
          showReport={interview.showReport}
        />
      )}
    </div>
  );
}

