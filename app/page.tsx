"use client";

import { useState, useCallback } from "react";
import ProblemPanel from "@/components/ProblemPanel";
import CodeEditor, { defaultCode, type EditorLanguage } from "@/components/CodeEditor";
import ConsoleOutput, { type TestResult } from "@/components/ConsoleOutput";
import ControlBar from "@/components/ControlBar";

export default function Home() {
  const [language, setLanguage] = useState<EditorLanguage>("python");
  const [code, setCode] = useState(defaultCode[language]);
  const [output, setOutput] = useState("");
  const [testResults, setTestResults] = useState<TestResult[]>([]);

  const handleLanguageChange = useCallback((lang: EditorLanguage) => {
    setLanguage(lang);
    setCode(defaultCode[lang]);
    setOutput("");
    setTestResults([]);
  }, []);

  const handleRunCode = useCallback(() => {
    console.log("[Run Code] Language:", language);
    console.log("[Run Code] Code:", code);
    setOutput(`[Run Code] Executed with ${language}\n\n(Backend not implemented yet)`);
    setTestResults([
      { id: 1, status: "pass", message: "Test case 1", output: "[0, 1]" },
      { id: 2, status: "fail", message: "Test case 2", output: "Expected [1, 2], got []" },
    ]);
  }, [language, code]);

  const handleGetHint = useCallback(() => {
    console.log("[Get AI Hint] Requested");
    setOutput("[Get AI Hint] AI hint requested\n\n(Backend not implemented yet)");
    setTestResults([]);
  }, []);

  return (
    <div className="flex h-screen flex-col bg-[#0d1117]">
      {/* Header */}
      <header className="flex shrink-0 items-center justify-between border-b border-[#30363d] bg-[#161b22] px-6 py-4">
        <h1 className="text-lg font-semibold text-white">
          AI Coding Mentor
        </h1>
        <span className="text-sm text-gray-400">Practice with AI guidance</span>
      </header>

      {/* Main content: Left + Right panels */}
      <div className="flex min-h-0 flex-1">
        {/* Left Panel - Problem (40%) */}
        <aside className="w-[40%] shrink-0 border-r border-[#30363d]">
          <ProblemPanel />
        </aside>

        {/* Right Panel - Editor (60%) */}
        <main className="flex w-[60%] flex-col min-w-0">
          <div className="flex flex-1 flex-col overflow-hidden p-4">
            <CodeEditor
              value={code}
              onChange={setCode}
              language={language}
              height={500}
            />
            <ControlBar
              language={language}
              onLanguageChange={handleLanguageChange}
              onRunCode={handleRunCode}
              onGetHint={handleGetHint}
            />
          </div>
        </main>
      </div>

      {/* Bottom Panel - Console (full width) */}
      <section className="h-[200px] shrink-0 border-t border-[#30363d]">
        <ConsoleOutput output={output} testResults={testResults} />
      </section>
    </div>
  );
}
