import { NextRequest, NextResponse } from "next/server";

type ImportProblemRequest = {
  problemText?: string;
};

type StarterCode = {
  c?: string;
  cpp?: string;
  java?: string;
  python?: string;
  python3?: string;
  javascript?: string;
  typescript?: string;
  csharp?: string;
};

type ImportedProblem = {
  title: string;
  description: string;
  constraints: string[];
  examples: Array<{ input: string; output: string }>;
  starter_code: StarterCode;
};

/** Generic fallback stubs used when the AI omits a language */
const genericStubs: Required<StarterCode> = {
  c:          `void solution() {\n    // TODO: implement\n}`,
  cpp:        `class Solution {\npublic:\n    void solution() {\n        // TODO: implement\n    }\n};`,
  java:       `class Solution {\n    public void solution() {\n        // TODO: implement\n    }\n}`,
  python:     `def solution():\n    # TODO: implement\n    pass`,
  python3:    `def solution():\n    # TODO: implement\n    pass`,
  javascript: `function solution() {\n    // TODO: implement\n}`,
  typescript: `function solution(): void {\n    // TODO: implement\n}`,
  csharp:     `public class Solution {\n    public void SolutionMethod() {\n        // TODO: implement\n    }\n}`,
};

/** Fill any missing language with a generic stub */
function mergeWithFallbacks(starter: StarterCode): Required<StarterCode> {
  const out: any = {};
  for (const lang of Object.keys(genericStubs) as Array<keyof StarterCode>) {
    out[lang] = starter[lang] && starter[lang]!.trim() ? starter[lang] : genericStubs[lang];
  }
  return out as Required<StarterCode>;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ImportProblemRequest;
    const { problemText } = body;

    if (!problemText || !problemText.trim()) {
      return NextResponse.json(
        { error: "Missing problemText" },
        { status: 400 }
      );
    }

    const apiKey =
      process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY;

    // Fallback: if no API key is configured, just wrap the text into a basic structure.
    if (!apiKey) {
      const fallback: ImportedProblem = {
        title: "Imported Problem",
        description: problemText.trim(),
        constraints: [],
        examples: [],
        starter_code: genericStubs,
      };

      return NextResponse.json(fallback);
    }

    const systemPrompt = `You are a coding problem parser. Given a competitive programming / LeetCode-style problem statement, extract a concise title, description, constraints list, examples, and starter code for C, C++, Java, Python, Python3, JavaScript, TypeScript, and C#.

IMPORTANT RULES FOR STARTER CODE:
- Extract the REAL function/class signature that matches the problem (do NOT use generic "solution()" names).
- DO NOT include a full solution. Only provide function/class SIGNATURES with empty bodies and a "// TODO: implement" comment.
- For Python/Python3: body should only contain "pass".
- For Java/C#: include the correct return type and a dummy return statement if needed.
- For JavaScript/TypeScript: use the correct function name and parameter names from the problem.
- Mirror LeetCode style exactly.

Respond with STRICT JSON only (no markdown fences, no commentary) matching this shape:
{"title": string, "description": string, "constraints": string[], "examples": [{"input": string, "output": string}], "starter_code": {"c": string, "cpp": string, "java": string, "python": string, "python3": string, "javascript": string, "typescript": string, "csharp": string}}`;

    const userPrompt = `Problem statement:

${problemText}

Return ONLY the JSON object.`;

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
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          max_tokens: 2500,
        }),
      }
    );

    if (!response.ok) {
      const err = await response.text();
      console.error("[import-problem] OpenRouter error:", err);
      return NextResponse.json(
        { error: "Failed to parse problem" },
        { status: 502 }
      );
    }

    const data = await response.json();
    let content: string | undefined =
      data.choices?.[0]?.message?.content?.trim();

    if (!content) {
      return NextResponse.json(
        { error: "Failed to parse problem" },
        { status: 500 }
      );
    }

    // Strip markdown code fences if the model wraps its JSON
    content = content.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();

    let parsed: ImportedProblem;
    try {
      parsed = JSON.parse(content) as ImportedProblem;
    } catch (err) {
      console.error("[import-problem] JSON parse error:", err, content);
      return NextResponse.json(
        { error: "Failed to parse problem" },
        { status: 500 }
      );
    }

    // Always ensure every language has at least a stub
    parsed.starter_code = mergeWithFallbacks(parsed.starter_code ?? {});

    return NextResponse.json(parsed);
  } catch (error) {
    console.error("[import-problem] Error:", error);
    return NextResponse.json(
      { error: "Failed to parse problem" },
      { status: 500 }
    );
  }
}

