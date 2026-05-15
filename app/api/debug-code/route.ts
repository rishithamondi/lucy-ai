import { NextRequest, NextResponse } from "next/server";

type DebugCodeRequestBody = {
  problem?: string;
  code?: string;
  language?: string;
};

type DebugCodeResponseBody = {
  debugInfo: string;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as DebugCodeRequestBody;
    const { problem, code, language } = body;

    if (!problem || !code || !language) {
      return NextResponse.json<DebugCodeResponseBody>(
        {
          debugInfo:
            "Please provide a problem description, your current code, and the language so I can debug your solution.",
        },
        { status: 400 }
      );
    }

    const apiKey =
      process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY;

    const prompt = `You are an expert programming mentor and runtime debugger.

A student is solving this problem:
${problem}

Their current code:
${"```"}
${language}
${code}
${"```"}

Language: ${language}

Provide a **Runtime Debugging Report**. Your focus is strictly on **how the code executes and where problems occur during execution**. Do NOT provide a static code review (logic mistakes, edge cases, and optimizations are handled elsewhere).

Structure your response with these exact sections:

### 1. Execution Walkthrough
Simulate the algorithm using a small, concrete example input (e.g., Input: [2,0,2,1,1,0]). Show the **key execution steps** and major state transitions. 
- Highlight only **important events** (e.g., "Step 1: mid = 0, swap with high", "Step 2: pointer incremented").
- Skip repetitive loop iterations that don't change the critical state.

### 2. Variable State Tracking
Display important variable values (e.g., low, mid, high, pointers, current_total) at the critical moments identified in the walkthrough. This helps the student visualize the algorithm's progress.

### 3. Runtime Issues
Detect issues that occur **during execution**, such as:
- Infinite loop risks
- Pointer/index mismanagement
- Incorrect swaps or assignments
- Out-of-bounds errors
If the execution behaves as expected, confirm this.

### 4. Debug Insight
Provide a short, direct explanation of **why the algorithm behaves this way during execution**. Focus on the **execution flow** and physical movement of data, not on algorithm theory or optimality.

Guidelines:
- **Focus on execution, not logic review**.
- Be concise and focus on "Runtime Behavior".
- If the code is correct, help the user understand the "flow" of their successful implementation.`;

    if (!apiKey) {
      return NextResponse.json<DebugCodeResponseBody>({
        debugInfo:
          "Without an AI key configured, I can only provide general debugging advice: check your loop conditions, ensure all variables are initialized, and use print statements to track the values of pointers and accumulators.",
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
          max_tokens: 800,
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      console.error("[debug-code] OpenRouter error:", errText);
      return NextResponse.json<DebugCodeResponseBody>(
        {
          debugInfo:
            "⚠️ Could not debug your code. Please try again in a moment.",
        },
        { status: 502 }
      );
    }

    const data = await response.json();
    const debugInfo: string =
      data.choices?.[0]?.message?.content?.trim() ||
      "⚠️ Could not debug your code. Please try again in a moment.";

    return NextResponse.json<DebugCodeResponseBody>({ debugInfo });
  } catch (error) {
    console.error("[debug-code] Error:", error);
    return NextResponse.json<DebugCodeResponseBody>(
      {
        debugInfo:
          "⚠️ Could not debug your code due to an internal error. Please try again.",
      },
      { status: 500 }
    );
  }
}
