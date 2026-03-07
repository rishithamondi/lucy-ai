import { NextRequest, NextResponse } from "next/server";

type AiHintRequestBody = {
  problem?: string;
  code?: string;
  language?: string;
};

type AiHintResponseBody = {
  hint: string;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as AiHintRequestBody;
    const { problem, code, language } = body;

    if (!problem || !code || !language) {
      return NextResponse.json<AiHintResponseBody>(
        {
          hint:
            "Please provide a problem description, your current code, and the language to get an AI hint.",
        },
        { status: 400 }
      );
    }

    const apiKey =
      process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY;

    const prompt = `You are an expert coding mentor.

A student is solving this problem:

${problem}

Their current code:
${"```"}
${language}
${code}
${"```"}

Language: ${language}

Provide a helpful hint that guides the student toward the correct approach.

Rules:
- Do NOT give the full solution
- Explain the correct direction
- Mention possible algorithm ideas
- Mention time complexity improvements if relevant`;

    // If no AI key is configured, return a static, generic hint.
    if (!apiKey) {
      return NextResponse.json<AiHintResponseBody>({
        hint:
          "Focus on understanding the problem constraints and think about which data structure or algorithm family (e.g., two pointers, binary search, hashing, dynamic programming) could reduce the time complexity compared to a naive brute-force approach.",
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
          max_tokens: 400,
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      console.error("[ai-hint] OpenRouter error:", errText);
      return NextResponse.json<AiHintResponseBody>(
        {
          hint:
            "⚠️ Could not generate AI hint. Please try again in a moment.",
        },
        { status: 502 }
      );
    }

    const data = await response.json();
    const hint: string =
      data.choices?.[0]?.message?.content?.trim() ||
      "⚠️ Could not generate AI hint. Please try again in a moment.";

    return NextResponse.json<AiHintResponseBody>({ hint });
  } catch (error) {
    console.error("[ai-hint] Error:", error);
    return NextResponse.json<AiHintResponseBody>(
      {
        hint:
          "⚠️ Could not generate AI hint due to an internal error. Please try again.",
      },
      { status: 500 }
    );
  }
}

