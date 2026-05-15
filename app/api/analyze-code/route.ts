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

Provide a **High Level Code Review** (Static Analysis). Structure your response with the following sections:

### 1. Syntax Check
Analyze if the code follows the language syntax rules and will compile/run.

### 2. Logical Mistakes
Identify any logical errors or discrepancies compared to the problem requirements.

### 3. Possible Edge Cases Missed
Suggest specific inputs (e.g., empty array, large numbers, single element) that might break the current implementation.

### 4. Time & Space Complexity
Explain the O(n) time and space complexity based on the code structure (loops, recursion, storage).

### 5. Suggestions for Improvement
Recommend cleaner, more readable, or more efficient approaches without giving away the full optimized code immediately.

Guidelines:
- Do NOT provide the full solution code.
- Be encouraging but technically precise.
- Use clear, professional formatting.`;

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

