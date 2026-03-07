import { NextRequest, NextResponse } from "next/server";

type EdgeCasesRequestBody = {
  problem?: string;
  code?: string;
  language?: string;
};

type EdgeCasesResponseBody = {
  edgeCases: string;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as EdgeCasesRequestBody;
    const { problem, code, language } = body;

    if (!problem || !code || !language) {
      return NextResponse.json<EdgeCasesResponseBody>(
        {
          edgeCases:
            "Please provide a problem description, your current code, and the language so I can suggest edge cases.",
        },
        { status: 400 }
      );
    }

    const apiKey =
      process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY;

    const prompt = `You are an expert programming mentor.

Based on the following coding problem and student solution, generate useful edge test cases that could break incorrect solutions.

Problem:
${problem}

Student code:
${"```"}
${language}
${code}
${"```"}

Return 5 important edge cases with explanations.`;

    // If no AI key, return a generic message.
    if (!apiKey) {
      return NextResponse.json<EdgeCasesResponseBody>({
        edgeCases:
          "Edge cases often include: minimal input size, maximal input size, inputs with all identical values, strictly increasing/decreasing sequences, and values near integer limits or boundaries defined in the constraints.",
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
      console.error("[edge-cases] OpenRouter error:", errText);
      return NextResponse.json<EdgeCasesResponseBody>(
        {
          edgeCases:
            "⚠️ Could not generate edge cases. Please try again in a moment.",
        },
        { status: 502 }
      );
    }

    const data = await response.json();
    const content: string =
      data.choices?.[0]?.message?.content?.trim() ||
      "⚠️ Could not generate edge cases. Please try again in a moment.";

    return NextResponse.json<EdgeCasesResponseBody>({ edgeCases: content });
  } catch (error) {
    console.error("[edge-cases] Error:", error);
    return NextResponse.json<EdgeCasesResponseBody>(
      {
        edgeCases:
          "⚠️ Could not generate edge cases due to an internal error. Please try again.",
      },
      { status: 500 }
    );
  }
}

