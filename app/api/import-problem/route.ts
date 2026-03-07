import { NextRequest, NextResponse } from "next/server";

type ImportProblemRequest = {
  problemText?: string;
};

type ImportedProblem = {
  title: string;
  description: string;
  constraints: string[];
  examples: Array<{ input: string; output: string }>;
  starter_code: {
    python: string;
    java: string;
  };
};

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
        starter_code: {
          python: `def solution():
    # TODO: implement
    pass`,
          java: `class Solution {
    public void solution() {
        // TODO: implement
    }
}`,
        },
      };

      return NextResponse.json(fallback);
    }

    const systemPrompt =
      "You are a coding problem parser. Given a competitive programming / LeetCode-style problem statement, extract a concise title, description, constraints list, examples, and starter code for Python and Java.\n\nIMPORTANT RULES FOR STARTER CODE:\n- DO NOT include a full solution.\n- Only provide function/class SIGNATURES with empty bodies and TODO comments.\n- For Python, body should be either `pass` or a placeholder like `raise NotImplementedError()`.\n- For Java, body should contain only placeholder code (e.g. `// TODO` and a dummy return like `return 0;` or `return new int[]{};`).\n\nRespond with STRICT JSON only, matching this TypeScript type exactly (no markdown, no commentary): {\"title\": string, \"description\": string, \"constraints\": string[], \"examples\": {\"input\": string, \"output\": string}[], \"starter_code\": {\"python\": string, \"java\": string}}.";

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
          max_tokens: 800,
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
    const content: string | undefined =
      data.choices?.[0]?.message?.content?.trim();

    if (!content) {
      return NextResponse.json(
        { error: "Failed to parse problem" },
        { status: 500 }
      );
    }

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

    return NextResponse.json(parsed);
  } catch (error) {
    console.error("[import-problem] Error:", error);
    return NextResponse.json(
      { error: "Failed to parse problem" },
      { status: 500 }
    );
  }
}

