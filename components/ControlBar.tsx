"use client";

import type { EditorLanguage } from "./CodeEditor";

interface ControlBarProps {
  language: EditorLanguage;
  onLanguageChange: (lang: EditorLanguage) => void;
  onRunCode: () => void;
  onGetHint: () => void;
}

export default function ControlBar({
  language,
  onLanguageChange,
  onRunCode,
  onGetHint,
}: ControlBarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[#333] bg-[#252526] px-4 py-3">
      <div className="flex items-center gap-2">
        <label className="text-sm text-gray-400">Language:</label>
        <select
          value={language}
          onChange={(e) =>
            onLanguageChange(e.target.value as EditorLanguage)
          }
          className="rounded border border-[#444] bg-[#333] px-3 py-1.5 text-sm text-white outline-none transition-colors hover:border-[#555] focus:border-amber-500"
        >
          <option value="python">Python</option>
          <option value="java">Java</option>
        </select>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={onRunCode}
          className="rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-500"
        >
          Run Code
        </button>
        <button
          onClick={onGetHint}
          className="rounded border border-amber-600 bg-transparent px-4 py-2 text-sm font-medium text-amber-400 transition-colors hover:bg-amber-600/20"
        >
          Get AI Hint
        </button>
      </div>
    </div>
  );
}
