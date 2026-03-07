import { NextRequest, NextResponse } from "next/server";

type AnalyzeCodeRequestBody = {
  problem?: string;
  code?: string;
  language?: string;
};

type AnalyzeCodeResponseBody = {
  analysis: string;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as AnalyzeCodeRequestBody;
    const { problem, code, language } = body;

    if (!problem || !code || !language) {
      return NextResponse.json<AnalyzeCodeResponseBody>(
        {
          analysis:
            "Please provide a problem description, your current code, and the language so I can analyze your solution.",
        },
        { status: 400 }
      );
    }

    const apiKey =
      process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY;

    const prompt = `You are an expert programming mentor.

A student is solving this problem:

${problem}

Their current code:
${"```"}
${language}
${code}
${"```"}

Language: ${language}

Analyze the code and explain:

1. Syntax mistakes
2. Logical mistakes
3. Possible edge cases missed
4. Time complexity of their approach
5. Suggestions for improvement

Do NOT provide the full solution.
Explain clearly like a mentor guiding a student.`;

    // If no AI key is configured, return a generic analysis-style message.
    if (!apiKey) {
      return NextResponse.json<AnalyzeCodeResponseBody>({
        analysis:
          "Without an AI key configured, I can only give a generic suggestion: check that your loops terminate correctly, handle edge cases like empty inputs or single-element arrays, and reason about whether your approach is worse than O(n log n) or O(n^2) given the constraints.",
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
          max_tokens: 600,
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      console.error("[analyze-code] OpenRouter error:", errText);
      return NextResponse.json<AnalyzeCodeResponseBody>(
        {
          analysis:
            "⚠️ Could not analyze your code. Please try again in a moment.",
        },
        { status: 502 }
      );
    }

    const data = await response.json();
    const analysis: string =
      data.choices?.[0]?.message?.content?.trim() ||
      "⚠️ Could not analyze your code. Please try again in a moment.";

    return NextResponse.json<AnalyzeCodeResponseBody>({ analysis });
  } catch (error) {
    console.error("[analyze-code] Error:", error);
    return NextResponse.json<AnalyzeCodeResponseBody>(
      {
        analysis:
          "⚠️ Could not analyze your code due to an internal error. Please try again.",
      },
      { status: 500 }
    );
  }
}

