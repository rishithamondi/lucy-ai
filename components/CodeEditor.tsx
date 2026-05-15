"use client";

import dynamic from "next/dynamic";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[500px] items-center justify-center bg-background text-gray-700">
      Loading editor...
    </div>
  ),
});

export type EditorLanguage =
  | "c"
  | "cpp"
  | "java"
  | "python"
  | "python3"
  | "javascript"
  | "typescript"
  | "csharp";

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language: EditorLanguage;
  height?: number | string;
}

// Monaco editor uses different language identifiers for some languages
const monacoLanguageMap: Record<EditorLanguage, string> = {
  c: "c",
  cpp: "cpp",
  java: "java",
  python: "python",
  python3: "python",   // Monaco has no "python3" - use "python"
  javascript: "javascript",
  typescript: "typescript",
  csharp: "csharp",
};

// Default blank templates for each language
const defaultCode: Record<EditorLanguage, string> = {
  c: "",
  cpp: "",
  java: "",
  python: "",
  python3: "",
  javascript: "",
  typescript: "",
  csharp: "",
};

export default function CodeEditor({
  value,
  onChange,
  language,
  height = 500,
}: CodeEditorProps) {
  const monacoLang = monacoLanguageMap[language] ?? language;

  return (
    <div
      className="min-h-0 shrink-0 overflow-hidden bg-transparent"
      style={{ height }}
    >
      <MonacoEditor
        height={height}
        language={monacoLang}
        value={value}
        onChange={(val) => onChange(val ?? "")}
        theme="vs-dark"
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          lineNumbers: "on",
          scrollBeyondLastLine: true,
          wordWrap: "off",
          padding: { top: 16 },
          folding: true,
          renderLineHighlight: "line",
          scrollbar: {
            vertical: "auto",
            horizontal: "auto",
            useShadows: true,
          },
        }}
      />
    </div>
  );
}

export { defaultCode };
