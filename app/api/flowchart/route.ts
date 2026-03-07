import { NextRequest, NextResponse } from "next/server";

type FlowchartRequestBody = {
  problem?: string;
  code?: string;
  language?: string;
};

export type FlowchartData = {
  mermaid: string;
  explanation: string;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as FlowchartRequestBody;
    const { problem, code, language } = body;

    if (!code || !code.trim()) {
      return NextResponse.json<FlowchartData>(
        { mermaid: "Error", explanation: "No code provided." },
        { status: 400 }
      );
    }

    const apiKey =
      process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY;

    const prompt = `You are an expert Data Structures and Algorithms mentor.

Generate a universal algorithm flowchart for the provided code. The flowchart must work for any algorithm (loops, recursion, backtracking, graph traversal, etc.) without relying on specific types of visualizers.

Return a JSON object with:
1. "mermaid": The strict Mermaid syntax for the flowchart (e.g., "flowchart TD\\n...").
   - VERY IMPORTANT: You MUST wrap all text labels in double quotes inside the node shapes to avoid syntax errors (e.g., \`A(["Start (array)"])\`, \`B[/"Read input"/]\`, \`C{"Check if nums[mid] == target"}\`).
   - Use proper symbols: Oval for Start/End \`id(["label"])\`, Rectangle for Process \`id["label"]\`, Diamond for Condition \`id{"label"}\`, Parallelogram for Input/Output \`id[/"label"/]\`.
   - Node IDs must be simple alphanumeric strings (A, B, C, id1, etc.). Do NOT use special characters in node IDs.
   - Do not wrap the mermaid string in \`\`\`mermaid or \`\`\`.
2. "explanation": A detailed explanation of the flowchart step-by-step.

Ensure the "mermaid" field ONLY contains the raw valid mermaid string.

Return JSON in this format:
{
  "mermaid": "flowchart TD\\nA([\\"Start\\"]) --> B[/\\"Read input\\"/]\\nB --> C{\\"Check condition\\"}\\nC -->|True| D[\\"Execute logic\\"]\\nC -->|False| E([\\"Return result\\"])",
  "explanation": "1. We start by...\\n2. Then we check..."
}

Problem:
${problem || "Not provided"}

Language: ${language || "Unknown"}

Code:
\`\`\`
${code}
\`\`\`
`;

    if (!apiKey) {
      return NextResponse.json<FlowchartData>({
        mermaid: "Error",
        explanation: "No API key configured. Please set OPENROUTER_API_KEY or OPENAI_API_KEY.",
      });
    }

    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          "HTTP-Referer":
            process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
        },
        body: JSON.stringify({
          model: "openai/gpt-4o-mini",
          messages: [{ role: "user", content: prompt }],
          max_tokens: 1500,
          response_format: { type: "json_object" },
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      console.error("[flowchart] OpenRouter error:", errText);
      return NextResponse.json<FlowchartData>(
        { mermaid: "", explanation: "Failed to connect to AI service." },
        { status: 502 }
      );
    }

    const data = await response.json();
    let content: string =
      data.choices?.[0]?.message?.content?.trim() ?? "";

    content = content.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();

    let mermaidCode = "";
    let explanation = "No explanation provided.";

    try {
      const parsed = JSON.parse(content) as { mermaid?: string; explanation?: string };
      if (parsed.mermaid) {
        // Strip markdown code fence from mermaid code if AI included it anyway inside JSON
        mermaidCode = String(parsed.mermaid).replace(/^```(?:mermaid)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();
      }
      if (parsed.explanation) {
        explanation = String(parsed.explanation);
      }
    } catch {
      console.error("[flowchart] Failed to parse JSON", content);
      return NextResponse.json<FlowchartData>(
        { mermaid: "", explanation: "Could not parse AI response." },
        { status: 500 }
      );
    }

    if (!mermaidCode) {
        // Fallback or handle failure to generate flowchart
        mermaidCode = "";
    }

    return NextResponse.json<FlowchartData>({ mermaid: mermaidCode, explanation });
  } catch (error) {
    console.error("[flowchart] Error:", error);
    return NextResponse.json<FlowchartData>(
      { mermaid: "", explanation: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
