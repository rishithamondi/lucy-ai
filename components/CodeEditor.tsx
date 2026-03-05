"use client";

import dynamic from "next/dynamic";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[500px] items-center justify-center bg-[#1e1e1e] text-gray-500">
      Loading editor...
    </div>
  ),
});

export type EditorLanguage = "python" | "java";

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language: EditorLanguage;
  height?: number;
}

const defaultCode = {
  python: `def two_sum(nums: list[int], target: int) -> list[int]:
    # Your code here
    pass`,
  java: `class Solution {
    public int[] twoSum(int[] nums, int target) {
        // Your code here
        return new int[]{};
    }
}`,
};

export default function CodeEditor({
  value,
  onChange,
  language,
  height = 500,
}: CodeEditorProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-[#333] bg-[#1e1e1e]">
      <MonacoEditor
        height={height}
        language={language}
        value={value}
        onChange={(val) => onChange(val ?? "")}
        theme="vs-dark"
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          lineNumbers: "on",
          scrollBeyondLastLine: false,
          wordWrap: "on",
          padding: { top: 16 },
          folding: true,
          renderLineHighlight: "line",
        }}
      />
    </div>
  );
}

export { defaultCode };
