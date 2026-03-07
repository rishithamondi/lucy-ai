import { NextRequest, NextResponse } from "next/server";

type TimeComplexityRequestBody = {
  problem?: string;
  code?: string;
  language?: string;
};

type TimeComplexityResponseBody = {
  complexity: string;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as TimeComplexityRequestBody;
    const { problem, code, language } = body;

    if (!problem || !code || !language) {
      return NextResponse.json<TimeComplexityResponseBody>(
        {
          complexity:
            "Please provide a problem description, your current code, and the language so I can analyze time and space complexity.",
        },
        { status: 400 }
      );
    }

    const apiKey =
      process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY;

    const prompt = `You are an expert Data Structures and Algorithms mentor.

A student is solving this problem:

${problem}

Here is their code:
${"```"}
${language}
${code}
${"```"}

Language:
${language}

Analyze the algorithm and explain:

1. Time Complexity (Big-O)
2. Space Complexity
3. Why the complexity is what it is
4. If there is a more optimal approach

Do NOT provide the full solution.
Explain clearly in a teaching style.`;

    // If no AI key is configured, return a generic complexity-style explanation.
    if (!apiKey) {
      return NextResponse.json<TimeComplexityResponseBody>({
        complexity:
          "Without an AI key configured, I can only give a general guideline: count how many times your main loops or recursive calls run with respect to input size n, and how much extra memory you allocate (arrays, maps, recursion depth). For many brute-force solutions, time is often O(n^2) or worse, and space is O(1) or O(n) depending on extra data structures used.",
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
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      console.error("[time-complexity] OpenRouter error:", errText);
      return NextResponse.json<TimeComplexityResponseBody>(
        {
          complexity:
            "⚠️ Could not analyze time complexity. Please try again in a moment.",
        },
        { status: 502 }
      );
    }

    const data = await response.json();
    const complexity: string =
      data.choices?.[0]?.message?.content?.trim() ||
      "⚠️ Could not analyze time complexity. Please try again in a moment.";

    return NextResponse.json<TimeComplexityResponseBody>({ complexity });
  } catch (error) {
    console.error("[time-complexity] Error:", error);
    return NextResponse.json<TimeComplexityResponseBody>(
      {
        complexity:
          "⚠️ Could not analyze time complexity due to an internal error. Please try again.",
      },
      { status: 500 }
    );
  }
}

