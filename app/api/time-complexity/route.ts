import { NextRequest, NextResponse } from "next/server";

type TimeComplexityRequestBody = {
  problem?: string;
  code?: string;
  language?: string;
};

type ComplexityReport = {
  value: string;
  explanation: string;
  reasoning: string;
  optimalSuggestion: string;
  isOptimal: boolean;
};

type TimeComplexityResponseBody = {
  time: ComplexityReport;
  space: ComplexityReport;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as TimeComplexityRequestBody;
    const { problem, code, language } = body;

    if (!problem || !code || !language) {
      return NextResponse.json(
        { error: "Missing fields" },
        { status: 400 }
      );
    }

    const apiKey =
      process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY;

    const prompt = `You are an expert DSA mentor. Analyze the following code for BOTH Time and Space complexity.
    
    Problem: ${problem}
    Code: ${code}
    Language: ${language}

    Return a JSON object with this exact structure:
    {
      "time": {
        "value": "e.g. O(n)",
        "explanation": "Short summary",
        "reasoning": "Detailed breakdown using loops/recursion",
        "optimalSuggestion": "Suggestions or 'This approach is already optimal for the given problem.'",
        "isOptimal": true/false
      },
      "space": {
        "value": "e.g. O(1)",
        "explanation": "Short summary",
        "reasoning": "Detailed breakdown of memory",
        "optimalSuggestion": "Suggestions or 'This approach is already optimal for the given problem.'",
        "isOptimal": true/false
      }
    }

    Focus on accuracy and educational value. Explain based on code structure.`;

    if (!apiKey) {
      const fallbackReport = {
        value: "O(?)",
        explanation: "API Key not configured",
        reasoning: "Please configure an API key to see detailed analysis.",
        optimalSuggestion: "N/A",
        isOptimal: true
      };
      return NextResponse.json({
        time: fallbackReport,
        space: fallbackReport
      });
    }

    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
        },
        body: JSON.stringify({
          model: "openai/gpt-4o-mini",
          messages: [{ role: "user", content: prompt }],
          response_format: { type: "json_object" },
          max_tokens: 800,
        }),
      }
    );

    if (!response.ok) {
      throw new Error("AI API failed");
    }

    const data = await response.json();
    const result = JSON.parse(data.choices[0].message.content);

    return NextResponse.json(result);
  } catch (error) {
    console.error("[time-complexity] Error:", error);
    return NextResponse.json(
      { error: "Internal Error" },
      { status: 500 }
    );
  }
}

