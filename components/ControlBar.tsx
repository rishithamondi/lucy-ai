"use client";

import type { EditorLanguage } from "./CodeEditor";

interface ControlBarProps {
  language: EditorLanguage;
  onLanguageChange: (lang: EditorLanguage) => void;
  onRunCode: () => void;
  onGetHint: () => void;
  onAnalyzeCode: () => void;
  onDebugCode: () => void;
  isRunning?: boolean;
  isDebugging?: boolean;
  isProblemLoaded?: boolean;
}

const LANGUAGES: { value: EditorLanguage; label: string }[] = [
  { value: "c",          label: "C" },
  { value: "cpp",        label: "C++" },
  { value: "java",       label: "Java" },
  { value: "python",     label: "Python" },
  { value: "python3",    label: "Python3" },
  { value: "javascript", label: "JavaScript" },
  { value: "typescript", label: "TypeScript" },
  { value: "csharp",     label: "C#" },
];

export default function ControlBar({
  language,
  onLanguageChange,
  onRunCode,
  onGetHint,
  onAnalyzeCode,
  onDebugCode,
  isRunning = false,
  isDebugging = false,
  isProblemLoaded = false,
}: ControlBarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border-t border-white/5 bg-[#161b22] px-4 py-3">
      <div className="flex items-center gap-2">
        <label className="shrink-0 text-sm text-gray-500">Language:</label>
        <select
          value={language}
          onChange={(e) =>
            onLanguageChange(e.target.value as EditorLanguage)
          }
          className="min-w-[130px] shrink-0 rounded-lg border border-white/10 bg-[#0f172a] px-3 py-2 text-sm text-white outline-none transition-colors hover:border-slate-500 focus:border-slate-400"
        >
          {LANGUAGES.map((lang) => (
            <option key={lang.value} value={lang.value}>
              {lang.label}
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={onRunCode}
          disabled={isRunning}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isRunning ? "Running..." : "Run Code"}
        </button>
        <button
          onClick={onGetHint}
          className="rounded-lg border border-white/5 bg-[#21262d] px-4 py-2 text-sm font-medium text-[#c9d1d9] transition-all hover:bg-[#30363d] hover:border-[#8b949e]"
        >
          AI Hint
        </button>
        <button
          onClick={onAnalyzeCode}
          disabled={isDebugging || isRunning}
          className="rounded-lg border border-white/5 bg-[#21262d] px-4 py-2 text-sm font-medium text-[#c9d1d9] transition-all hover:bg-[#30363d] hover:border-[#8b949e] disabled:opacity-50"
        >
          Analyze
        </button>
        <button
          onClick={onDebugCode}
          disabled={isDebugging || isRunning}
          className="rounded-lg border border-white/5 bg-violet-600/20 px-4 py-2 text-sm font-medium text-violet-300 transition-all hover:bg-violet-600/30 hover:border-violet-600/40 disabled:opacity-50"
        >
          {isDebugging ? "Debugging..." : "Debug"}
        </button>
      </div>
    </div>
  );
}
