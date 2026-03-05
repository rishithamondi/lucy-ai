"use client";

interface ProblemPanelProps {
  title?: string;
  description?: string;
  constraints?: string[];
  examples?: Array<{
    input: string;
    output: string;
  }>;
}

const defaultProblem = {
  title: "Two Sum",
  description:
    "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.\n\nYou may assume that each input would have exactly one solution, and you may not use the same element twice.\n\nYou can return the answer in any order.",
  constraints: [
    "2 <= nums.length <= 10⁴",
    "-10⁹ <= nums[i] <= 10⁹",
    "-10⁹ <= target <= 10⁹",
    "Only one valid answer exists.",
  ],
  examples: [
    {
      input: "nums = [2, 7, 11, 15], target = 9",
      output: "[0, 1]",
    },
    {
      input: "nums = [3, 2, 4], target = 6",
      output: "[1, 2]",
    },
  ],
};

export default function ProblemPanel({
  title = defaultProblem.title,
  description = defaultProblem.description,
  constraints = defaultProblem.constraints,
  examples = defaultProblem.examples,
}: ProblemPanelProps) {
  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#1e1e1e] text-gray-200">
      <div className="flex-1 overflow-y-auto p-6">
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
      </div>
    </div>
  );
}
