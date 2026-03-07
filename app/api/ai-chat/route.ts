import { NextRequest, NextResponse } from "next/server";

type AiChatRequestBody = {
  problem?: string;
  code?: string;
  language?: string;
  message?: string;
};

type AiChatResponseBody = {
  reply: string;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as AiChatRequestBody;
    const { problem, code, language, message } = body;

    if (!problem || !code || !language || !message) {
      return NextResponse.json<AiChatResponseBody>(
        {
          reply:
            "Please provide the problem, your current code, the language, and your question so I can help you.",
        },
        { status: 400 }
      );
    }

    const apiKey =
      process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY;

    const prompt = `You are an expert programming mentor helping a student solve a coding problem.

Problem:
${problem}

Student's current code:
${"```"}
${language}
${code}
${"```"}

Language:
${language}

Student question:
${message}

Instructions for responding:
1. If the question is a simple yes/no or syntax query, give a short, direct answer.
2. If the student is asking why their code is wrong/failing (debugging), explain the issue step-by-step.
3. If they are asking a conceptual question or for an optimization, provide a clear explanation with brief examples.
4. Avoid unnecessarily long responses or huge blocks of code.
5. Do not immediately give the full solution unless explicitly asked. Guide them to the answer.`;

    // If no AI key configured, return a static guidance message.
    if (!apiKey) {
      return NextResponse.json<AiChatResponseBody>({
        reply:
          "I can help best when an AI key is configured. For now, try explaining your approach step-by-step and check whether each part matches the problem constraints and handles edge cases like empty inputs or extreme values.",
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
      console.error("[ai-chat] OpenRouter error:", errText);
      return NextResponse.json<AiChatResponseBody>(
        {
          reply:
            "⚠️ The AI mentor is temporarily unavailable. Please try again in a moment.",
        },
        { status: 502 }
      );
    }

    const data = await response.json();
    const reply: string =
      data.choices?.[0]?.message?.content?.trim() ||
      "⚠️ The AI mentor could not generate a response. Please try again.";

    return NextResponse.json<AiChatResponseBody>({ reply });
  } catch (error) {
    console.error("[ai-chat] Error:", error);
    return NextResponse.json<AiChatResponseBody>(
      {
        reply:
          "⚠️ An internal error occurred while contacting the AI mentor. Please try again.",
      },
      { status: 500 }
    );
  }
}

