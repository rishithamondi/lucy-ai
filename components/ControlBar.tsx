"use client";

import type { EditorLanguage } from "./CodeEditor";

interface ControlBarProps {
  language: EditorLanguage;
  onLanguageChange: (lang: EditorLanguage) => void;
  onRunCode: () => void;
  onGetHint: () => void;
  onAnalyzeCode: () => void;
  onTimeComplexity: () => void;
  isRunning?: boolean;
}

export default function ControlBar({
  language,
  onLanguageChange,
  onRunCode,
  onGetHint,
  onAnalyzeCode,
  onTimeComplexity,
  isRunning = false,
}: ControlBarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[#30363d] bg-[#252526] px-4 py-3">
      <div className="flex items-center gap-2">
        <label className="shrink-0 text-sm text-gray-400">Language:</label>
        <select
          value={language}
          onChange={(e) =>
            onLanguageChange(e.target.value as EditorLanguage)
          }
          className="min-w-[120px] shrink-0 rounded border border-[#444] bg-[#333] px-3 py-2 text-sm text-white outline-none transition-colors hover:border-amber-500/50 focus:border-amber-500"
        >
          <option value="python">Python</option>
          <option value="java">Java</option>
        </select>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={onRunCode}
          disabled={isRunning}
          className="rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isRunning ? "Running..." : "Run Code"}
        </button>
        <button
          onClick={onGetHint}
          className="rounded border border-amber-600 bg-transparent px-4 py-2 text-sm font-medium text-amber-400 transition-colors hover:bg-amber-600/20"
        >
          Get AI Hint
        </button>
        <button
          onClick={onAnalyzeCode}
          className="rounded border border-sky-600 bg-transparent px-4 py-2 text-sm font-medium text-sky-400 transition-colors hover:bg-sky-600/20"
        >
          Analyze Code
        </button>
        <button
          onClick={onTimeComplexity}
          className="rounded border border-purple-600 bg-transparent px-4 py-2 text-sm font-medium text-purple-300 transition-colors hover:bg-purple-600/20"
        >
          Time Complexity
        </button>
      </div>
    </div>
  );
}
