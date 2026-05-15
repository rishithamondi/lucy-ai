import { NextRequest, NextResponse } from "next/server";

type FlowchartRequestBody = {
  problem?: string;
  code?: string;
  language?: string;
};

export type FlowchartData = {
  mermaid: string;
  explanation: string;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as FlowchartRequestBody;
    const { problem, code, language } = body;

    if (!code || !code.trim()) {
      return NextResponse.json<FlowchartData>(
        { mermaid: "Error", explanation: "No code provided." },
        { status: 400 }
      );
    }

    const apiKey =
      process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY;

    const prompt = `You are an expert Data Structures and Algorithms mentor.

Generate a universal algorithm flowchart for the provided code. The flowchart must be structurally accurate and use strictly valid Mermaid.js syntax.

Constraints for Mermaid Syntax:
1. Start with "flowchart TD".
2. Use alphanumeric node IDs only (e.g., A, B, C1, Step1). Do NOT use spaces or special characters in IDs.
3. ALWAYS wrap all text labels in double quotes inside the shapes:
   - Start/End: \`ID(["Start/End Label"])\`
   - Process: \`ID["Process Description"]\`
   - Decision: \`ID{"Decision Condition?"}\`
   - I/O: \`ID[/"Input/Output"/]\`
4. Avoid using any special characters like \`[\`, \`]\`, \`(\`, \`)\`, \`{\`, \`}\` inside the labels themselves unless they are properly escaped or enclosed in double quotes.
5. Ensure logic flow is logical and follows the provided code.

Return a JSON object with:
1. "mermaid": The raw Mermaid syntax string.
2. "explanation": A concise step-by-step description of the logic flow.

Return format:
{
  "mermaid": "flowchart TD...",
  "explanation": "1. ...\\n2. ..."
}

Problem:
${problem || "Not provided"}

Language: ${language || "Unknown"}

Code:
\`\`\`
${code}
\`\`\`
`;

    if (!apiKey) {
      return NextResponse.json<FlowchartData>({
        mermaid: "Error",
        explanation: "No API key configured. Please set OPENROUTER_API_KEY or OPENAI_API_KEY.",
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
          max_tokens: 1500,
          response_format: { type: "json_object" },
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      console.error("[flowchart] OpenRouter error:", errText);
      return NextResponse.json<FlowchartData>(
        { mermaid: "", explanation: "Failed to connect to AI service." },
        { status: 502 }
      );
    }

    const data = await response.json();
    let content: string =
      data.choices?.[0]?.message?.content?.trim() ?? "";

    content = content.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();

    let mermaidCode = "";
    let explanation = "No explanation provided.";

    try {
      const parsed = JSON.parse(content) as { mermaid?: string; explanation?: string };
      if (parsed.mermaid) {
        // Strip markdown code fence from mermaid code if AI included it anyway inside JSON
        mermaidCode = String(parsed.mermaid).replace(/^```(?:mermaid)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();
      }
      if (parsed.explanation) {
        explanation = String(parsed.explanation);
      }
    } catch {
      console.error("[flowchart] Failed to parse JSON", content);
      return NextResponse.json<FlowchartData>(
        { mermaid: "", explanation: "Could not parse AI response." },
        { status: 500 }
      );
    }

    if (!mermaidCode) {
        // Fallback or handle failure to generate flowchart
        mermaidCode = "";
    }

    return NextResponse.json<FlowchartData>({ mermaid: mermaidCode, explanation });
  } catch (error) {
    console.error("[flowchart] Error:", error);
    return NextResponse.json<FlowchartData>(
      { mermaid: "", explanation: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
