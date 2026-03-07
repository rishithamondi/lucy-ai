"use client";

import { useState, useCallback } from "react";
import { Panel, Group, Separator } from "react-resizable-panels";
import ProblemPanel, { defaultProblem } from "@/components/ProblemPanel";
import CodeEditor, { defaultCode, type EditorLanguage } from "@/components/CodeEditor";
import ConsoleOutput, { type TestResult } from "@/components/ConsoleOutput";
import ControlBar from "@/components/ControlBar";
import AiMentorChat from "@/components/AiMentorChat";
import {
  buildPythonRunner,
  buildJavaRunner,
  extractPythonFunctionName,
  extractJavaClassAndMethod,
  outputsMatch,
} from "@/lib/runnerUtils";


export type FlowchartData = {
  mermaid: string;
  explanation: string;
};

export default function Home() {
  const [language, setLanguage] = useState<EditorLanguage>("python");
  const [code, setCode] = useState(defaultCode[language]);
  const [consoleOutput, setConsoleOutput] = useState("");
  const [aiFeedback, setAiFeedback] = useState("");
  const [edgeCasesOutput, setEdgeCasesOutput] = useState("");
  const [detectedComplexity, setDetectedComplexity] = useState("");
  const [showComplexityGraph, setShowComplexityGraph] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isGeneratingEdgeCases, setIsGeneratingEdgeCases] = useState(false);
  const [flowchartData, setFlowchartData] = useState<FlowchartData | null>(null);
  const [isGeneratingFlowchart, setIsGeneratingFlowchart] = useState(false);
  const [problemMeta, setProblemMeta] = useState(() => ({
    title: defaultProblem.title,
    description: defaultProblem.description,
    constraints: defaultProblem.constraints,
    examples: defaultProblem.examples,
  }));
  const [starterCode, setStarterCode] = useState(() => ({
    python: defaultCode.python,
    java: defaultCode.java,
  }));

  const handleLanguageChange = useCallback((lang: EditorLanguage) => {
    setLanguage(lang);
    setCode((prev) => {
      const next =
        starterCode[lang] ??
        defaultCode[lang as keyof typeof defaultCode] ??
        prev;
      return next;
    });
    setConsoleOutput("");
    setAiFeedback("");
    setEdgeCasesOutput("");
    setTestResults([]);
    setDetectedComplexity("");
    setShowComplexityGraph(false);
  }, [starterCode]);

  const handleRunCode = useCallback(async () => {
    const examples = problemMeta.examples ?? [];
    if (examples.length === 0) {
      setConsoleOutput(
        "No example test cases. Import a problem with examples first, or add examples in the problem description."
      );
      setTestResults([]);
      return;
    }

    let combinedCode: string;
    if (language === "python") {
      const fnName = extractPythonFunctionName(code);
      if (!fnName) {
        setConsoleOutput(
          "Could not detect a function definition (e.g. def my_func(...)) in your code. Add a function and try again."
        );
        setTestResults([]);
        return;
      }
      combinedCode = buildPythonRunner(code, fnName, examples);
    } else if (language === "java") {
      const extracted = extractJavaClassAndMethod(code);
      if (!extracted) {
        setConsoleOutput(
          "Could not detect a public method (e.g. public int myMethod(...)) in your code. Add a class with a public method and try again."
        );
        setTestResults([]);
        return;
      }
      combinedCode = buildJavaRunner(
        code,
        extracted.className,
        extracted.methodName,
        examples
      );
    } else {
      setConsoleOutput("Unsupported language for run.");
      setTestResults([]);
      return;
    }

    setIsRunning(true);
    setConsoleOutput("Running...");
    setTestResults([]);
    setAiFeedback("");

    try {
      const res = await fetch("/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language,
          code: combinedCode,
        }),
      });

      const data = await res.json().catch(() => ({}));
      const rawOutput = (data?.output as string) ?? "";

      if (!res.ok) {
        setConsoleOutput(rawOutput || "Execution failed. Please try again.");
        return;
      }

      const outputLines = rawOutput
        .split(/\r?\n/)
        .map((s: string) => s.trim())
        .filter((s: string) => s.length > 0);

      const results: TestResult[] = examples.map((ex, i) => {
        const actual = outputLines[i] ?? "";
        const expected = ex.output ?? "";
        const pass = outputsMatch(actual, expected);
        return {
          id: i + 1,
          status: pass ? "pass" : "fail",
          message: `Test case ${i + 1}`,
          input: ex.input,
          expectedOutput: expected,
          actualOutput: actual,
        };
      });

      setTestResults(results);
      setConsoleOutput("");
    } catch (err) {
      console.error("[handleRunCode] Error:", err);
      setConsoleOutput(
        "Execution service error. Check your connection and try again."
      );
    } finally {
      setIsRunning(false);
    }
  }, [language, code, problemMeta.examples]);

  const handleGetHint = useCallback(async () => {
    setTestResults([]);
    setAiFeedback("Generating AI hint...");
    setShowComplexityGraph(false);

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
          "⚠️ Could not generate AI hint. Please try again."
        );
        return;
      }

      const data = await res.json();
      const hint =
        (data?.hint as string | undefined) ||
        "⚠️ Could not generate AI hint. Please try again.";
      setAiFeedback(hint);
    } catch (err) {
      console.error("[handleGetHint] Error:", err);
      setAiFeedback(
        "⚠️ Could not generate AI hint. Please check your connection and try again."
      );
    }
  }, [problemMeta.description, code, language]);

  const handleAnalyzeCode = useCallback(async () => {
    setTestResults([]);
    setAiFeedback("Analyzing your code...");
    setShowComplexityGraph(false);

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
          "⚠️ Could not analyze your code. Please try again."
        );
        return;
      }

      const data = await res.json();
      const analysis =
        (data?.analysis as string | undefined) ||
        "⚠️ Could not analyze your code. Please try again.";
      setAiFeedback(analysis);
    } catch (err) {
      console.error("[handleAnalyzeCode] Error:", err);
      setAiFeedback(
        "⚠️ Could not analyze your code. Please check your connection and try again."
      );
    }
  }, [problemMeta.description, code, language]);

  const handleTimeComplexity = useCallback(async () => {
    setTestResults([]);
    setAiFeedback("Analyzing time complexity...");

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
        setAiFeedback(
          "⚠️ Could not analyze time complexity. Please try again."
        );
        return;
      }

      const data = await res.json();
      const complexityText =
        (data?.complexity as string | undefined) ||
        "⚠️ Could not analyze time complexity. Please try again.";
      setAiFeedback(complexityText);

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
      console.error("[handleTimeComplexity] Error:", err);
      setAiFeedback(
        "⚠️ Could not analyze time complexity. Please check your connection and try again."
      );
      setDetectedComplexity("");
      setShowComplexityGraph(false);
    }
  }, [problemMeta.description, code, language]);

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
          title: data.title ?? defaultProblem.title,
          description: data.description ?? defaultProblem.description,
          constraints: data.constraints ?? defaultProblem.constraints,
          examples: data.examples ?? defaultProblem.examples,
        };

        const nextStarter = {
          python: data.starter_code?.python ?? defaultCode.python,
          java: data.starter_code?.java ?? defaultCode.java,
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
    setIsGeneratingEdgeCases(true);
    setEdgeCasesOutput("Generating edge cases...");

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
  }, [problemMeta.description, code, language]);

  const handleGenerateFlowchart = useCallback(async () => {
    setIsGeneratingFlowchart(true);
    setFlowchartData(null);

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
  }, [problemMeta.description, code, language]);

  return (
    <div className="flex h-screen flex-col bg-[#0d1117]">
      {/* Header */}
      <header className="flex shrink-0 items-center justify-between border-b border-[#30363d] bg-[#161b22] px-6 py-4">
        <h1 className="text-lg font-semibold text-white">
          AI Coding Mentor
        </h1>
        <span className="text-sm text-gray-400">Practice with AI guidance</span>
      </header>

      {/* Main Resizable Layout */}
      <div className="min-h-0 flex-1 overflow-hidden">
        <Group orientation="vertical">
          {/* Top Panel (Problem & Editor) */}
          <Panel defaultSize={70} minSize={30}>
            <Group orientation="horizontal">
              {/* Left Panel - Problem */}
              <Panel defaultSize={40} minSize={20} className="bg-[#1e1e1e]">
                <ProblemPanel
                  title={problemMeta.title}
                  description={problemMeta.description}
                  constraints={problemMeta.constraints}
                  examples={problemMeta.examples}
                  onImportProblem={handleImportProblem}
                  isImporting={isImporting}
                />
              </Panel>

              {/* Horizontal Resize Handle */}
              <Separator className="w-[4px] bg-[#30363d] transition-all hover:bg-emerald-500/50 active:bg-emerald-500 cursor-col-resize" />

              {/* Right Panel - Editor */}
              <Panel defaultSize={60} minSize={30} className="flex flex-col bg-[#0d1117]">
                <div className="min-h-0 flex-1 overflow-hidden p-4 pb-0">
                  <CodeEditor
                    value={code}
                    onChange={setCode}
                    language={language}
                    height="100%"
                  />
                </div>
                <div className="shrink-0 px-4 py-3 border-t border-[#30363d]">
                  <ControlBar
                    language={language}
                    onLanguageChange={handleLanguageChange}
                    onRunCode={handleRunCode}
                    onGetHint={handleGetHint}
                    onAnalyzeCode={handleAnalyzeCode}
                    onTimeComplexity={handleTimeComplexity}
                    isRunning={isRunning}
                  />
                </div>
              </Panel>
            </Group>
          </Panel>

          {/* Vertical Resize Handle */}
          <Separator className="h-[4px] bg-[#30363d] transition-all hover:bg-emerald-500/50 active:bg-emerald-500 cursor-row-resize" />

          {/* Bottom Panel - Console */}
          <Panel defaultSize={30} minSize={15} className="overflow-hidden bg-[#1e1e1e]">
            <ConsoleOutput
              consoleOutput={consoleOutput}
              aiFeedback={aiFeedback}
              edgeCases={edgeCasesOutput}
              detectedComplexity={detectedComplexity}
              showComplexityGraph={showComplexityGraph}
              testResults={testResults}
              isRunning={isRunning}
              problemDescription={problemMeta.description}
              userCode={code}
              onGenerateEdgeCases={handleGenerateEdgeCases}
              isGeneratingEdgeCases={isGeneratingEdgeCases}
              flowchartData={flowchartData}
              onGenerateFlowchart={handleGenerateFlowchart}
              isGeneratingFlowchart={isGeneratingFlowchart}
            />
          </Panel>
        </Group>
      </div>

      {/* Floating AI Mentor Chat */}
      <AiMentorChat
        problem={problemMeta.description}
        code={code}
        language={language}
      />
    </div>
  );
}

