import { NextRequest, NextResponse } from "next/server";

type VisualizeRequestBody = {
  problem?: string;
  code?: string;
  language?: string;
};

export type VisualizerStep = {
  explanation: string;
  array?: number[];
  i?: number;
  j?: number;
};

export type VisualizerData = {
  pattern: string;
  steps: VisualizerStep[];
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as VisualizeRequestBody;
    const { problem, code, language } = body;

    if (!code || !code.trim()) {
      return NextResponse.json<VisualizerData>(
        { pattern: "Error", steps: [{ explanation: "No code provided." }] },
        { status: 400 }
      );
    }

    const apiKey =
      process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY;

    const prompt = `You are an expert Data Structures and Algorithms mentor.

Analyze the student's code and detect the algorithm pattern being used.

Then produce a step-by-step algorithm explanation, tracking the state of the primary array and important pointers (like 'i' and 'j').

Return JSON in this format:

{
  "pattern": "Two Pointers",
  "steps": [
    {
      "explanation": "Initialize pointers",
      "array": [1, 2, 3, 4, 5],
      "i": 0,
      "j": 4
    },
    {
      "explanation": "Move left pointer",
      "array": [1, 2, 3, 4, 5],
      "i": 1,
      "j": 4
    }
  ]
}

If the algorithm does not use an array or pointers, you may omit the "array", "i", and "j" fields from the step objects, providing just the "explanation".
Always supply the "explanation" field for each step.

Do not return code. Only return the pattern and step objects.

Problem:
${problem || "Not provided"}

Language: ${language || "Unknown"}

Code:
\`\`\`
${code}
\`\`\`
`;

    if (!apiKey) {
      return NextResponse.json<VisualizerData>({
        pattern: "Error",
        steps: [{ explanation: "No API key configured. Please set OPENROUTER_API_KEY or OPENAI_API_KEY." }],
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
          max_tokens: 500,
          response_format: { type: "json_object" },
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      console.error("[visualize] OpenRouter error:", errText);
      return NextResponse.json<VisualizerData>(
        { pattern: "Error", steps: [{ explanation: "Failed to connect to AI service." }] },
        { status: 502 }
      );
    }

    const data = await response.json();
    let content: string =
      data.choices?.[0]?.message?.content?.trim() ?? "";

    // Strip markdown code fence if present
    content = content.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();

    let pattern = "Unknown Pattern";
    let steps: VisualizerStep[] = [];
    try {
      const parsed = JSON.parse(content) as { pattern?: string; steps?: any[] };
      if (parsed.pattern) {
         pattern = String(parsed.pattern);
      }
      if (Array.isArray(parsed.steps)) {
        steps = parsed.steps.map((s) => {
          if (typeof s === "string") {
            return { explanation: s };
          }
          return {
            explanation: s?.explanation ? String(s.explanation) : "No explanation provided",
            array: Array.isArray(s?.array) ? s.array.map(Number) : undefined,
            i: typeof s?.i === "number" ? s.i : undefined,
            j: typeof s?.j === "number" ? s.j : undefined,
          };
        });
      }
    } catch {
      console.error("[visualize] Failed to parse JSON", content);
    }

    if (steps.length === 0) {
      pattern = "Parse Error";
      steps = [{ explanation: "Could not generate visualization from AI response." }];
    }

    return NextResponse.json<VisualizerData>({ pattern, steps });
  } catch (error) {
    console.error("[visualize] Error:", error);
    return NextResponse.json<VisualizerData>(
      { pattern: "Error", steps: [{ explanation: "An unexpected error occurred." }] },
      { status: 500 }
    );
  }
}
