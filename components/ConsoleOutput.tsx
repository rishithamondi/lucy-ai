"use client";

export type TestResult = {
  id: number;
  status: "pass" | "fail" | "pending";
  message?: string;
  output?: string;
};

interface ConsoleOutputProps {
  output?: string;
  testResults?: TestResult[];
  isRunning?: boolean;
}

export default function ConsoleOutput({
  output = "",
  testResults = [],
  isRunning = false,
}: ConsoleOutputProps) {
  return (
    <div className="flex h-full flex-col bg-[#1e1e1e] text-gray-300">
      <div className="flex items-center gap-2 border-b border-[#333] px-4 py-2">
        <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
          Console
        </span>
        {isRunning && (
          <span className="text-xs text-amber-400">Running...</span>
        )}
      </div>
      <div className="flex-1 overflow-auto p-4 font-mono text-sm">
        {testResults.length > 0 ? (
          <div className="space-y-2">
            {testResults.map((result) => (
              <div
                key={result.id}
                className="flex items-start gap-2 rounded px-2 py-1"
              >
                <span
                  className={`shrink-0 font-medium ${
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
                {result.message && (
                  <span className="text-gray-400">{result.message}</span>
                )}
                {result.output && (
                  <pre className="mt-1 text-xs text-gray-500">
                    {result.output}
                  </pre>
                )}
              </div>
            ))}
          </div>
        ) : output ? (
          <pre className="whitespace-pre-wrap break-words text-gray-400">
            {output}
          </pre>
        ) : (
          <p className="text-gray-600">
            Run your code to see output here.
          </p>
        )}
      </div>
    </div>
  );
}
