import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      problemDescription,
      userCode,
      testInput,
      expectedOutput,
      actualOutput,
    } = body;

    if (!problemDescription || !userCode || !testInput || expectedOutput == null || actualOutput == null) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const prompt = `You are a DSA mentor.
Explain why the user's code failed on the given testcase.
Do not give the full solution.
Give a debugging hint.

Problem:
${problemDescription}

User's code:
\`\`\`
${userCode}
\`\`\`

Failed test case:
Input: ${testInput}
Expected output: ${expectedOutput}
Actual output: ${actualOutput}

Explain the error and give a debugging hint:`;

    const apiKey =
      process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        explanation:
          "Your code returns an empty array [] instead of [1, 2]. Check if you're correctly iterating through the array and updating your result. The Two Sum problem requires finding two indices - ensure you're not returning early or missing a valid pair. Add print statements to trace which pairs you're checking.",
      });
    }

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      },
      body: JSON.stringify({
        model: "openai/gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`OpenRouter API error: ${err}`);
    }

    const data = await response.json();
    const explanation =
      data.choices?.[0]?.message?.content?.trim() ||
      "Unable to generate explanation.";

    return NextResponse.json({ explanation });
  } catch (error) {
    console.error("[explain] Error:", error);
    return NextResponse.json(
      {
        error: "Failed to explain error",
        explanation:
          "Could not get AI explanation. Check your API key and try again.",
      },
      { status: 500 }
    );
  }
}
