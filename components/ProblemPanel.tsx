"use client";

import { useState } from "react";
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
}

export const defaultProblem = twoSumProblem;

export default function ProblemPanel({
  title = defaultProblem.title,
  description = defaultProblem.description,
  constraints = defaultProblem.constraints,
  examples = defaultProblem.examples,
  onImportProblem,
  isImporting = false,
}: ProblemPanelProps) {
  const [importText, setImportText] = useState("");

  const handleLoadProblem = () => {
    const trimmed = importText.trim();
    if (!trimmed || !onImportProblem) return;
    onImportProblem(trimmed);
  };

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#1e1e1e] text-gray-200">
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Import Problem Section */}
        <section className="rounded-lg border border-[#333] bg-[#252526] p-4">
          <h2 className="mb-3 text-base font-medium text-white">
            Import Problem
          </h2>
          <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-gray-400">
            Paste Problem Statement
          </label>
          <textarea
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            className="mb-3 h-32 w-full resize-none rounded border border-[#444] bg-[#1e1e1e] px-3 py-2 text-sm text-gray-100 outline-none transition-colors placeholder:text-gray-500 hover:border-amber-500/50 focus:border-amber-500"
            placeholder="Paste a full problem statement here (title, description, constraints, examples)..."
          />
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={handleLoadProblem}
              disabled={!importText.trim() || isImporting || !onImportProblem}
              className="rounded bg-amber-600 px-4 py-1.5 text-xs font-medium text-white transition-colors hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isImporting ? "Parsing problem..." : "Load Problem"}
            </button>
            {isImporting && (
              <span className="text-xs text-amber-300">
                Parsing problem...
              </span>
            )}
          </div>
        </section>

        {/* Problem Content */}
        <section>
          <h1 className="mb-4 text-xl font-semibold text-white">{title}</h1>
          <div className="mb-6 space-y-2 text-sm leading-relaxed text-gray-300">
            {description.split("\n\n").map((para, i) => (
              <p key={i}>{para}</p>
            ))}
          </div>

          <h2 className="mb-2 text-base font-medium text-white">
            Constraints
          </h2>
          <ul className="mb-6 list-inside list-disc space-y-1 text-sm text-gray-400">
            {constraints.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>

          <h2 className="mb-2 text-base font-medium text-white">
            Examples
          </h2>
          <div className="space-y-4">
            {examples.map((ex, i) => (
              <div
                key={i}
                className="rounded-lg border border-[#333] bg-[#252526] p-4"
              >
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500">
                  Example {i + 1}
                </p>
                <p className="mb-2 text-sm text-gray-300">
                  <span className="text-gray-500">Input: </span>
                  {ex.input}
                </p>
                <p className="text-sm text-gray-300">
                  <span className="text-gray-500">Output: </span>
                  {ex.output}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

