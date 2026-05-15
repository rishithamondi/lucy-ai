import { NextRequest, NextResponse } from "next/server";

type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

type AiChatRequestBody = {
  problem?: string;
  code?: string;
  language?: string;
  message?: string;
  history?: ChatMessage[];
  isInterviewMode?: boolean;
  interviewDifficulty?: string;
};

type AiChatResponseBody = {
  reply: string;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as AiChatRequestBody;
    const { problem, code, language, message, history = [], isInterviewMode, interviewDifficulty } = body;

    if (!problem || !message) {
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

    let systemPrompt = "";

    if (isInterviewMode) {
      systemPrompt = `You are a strict, expert FAANG-level technical interviewer.
You are evaluating the candidate at a **${interviewDifficulty || 'Standard'}** difficulty level.

CORE BEHAVIOR:
- Ask ONLY ONE question at a time.
- Keep responses short (1-2 lines).
- DO NOT give full solutions.
- DO NOT over-explain. 
- Adapt your questions based on user input and context.
- Avoid repeating the same starting questions.

DYNAMIC INTERVIEW START:
- Do NOT always start with the same question. If the user says something like "Start the interview.", pick a dynamic starting question like "How would you approach this problem?", "What's your initial thought process?", or if code exists, "Walk me through your code."

ADAPTIVE INTERVIEW FLOW & REALISM:
- If user explains approach -> Ask deeper ("Why this approach?", "What's the expected time complexity?", "Any edge cases?").
- If user is vague -> Challenge them: "That's unclear. Be specific." or "Can you explain more precisely?"
- If user is strong -> Increase difficulty: "Can this be optimized further?", "What if constraints increase?"
- If code is present -> Ask about logic, decisions, edge cases, improvements ("Why did you choose this structure?", "What happens for empty input?")
- If user pauses or asks for a moment -> "Take your time. Walk me through your thinking."
- If user is wrong -> Interrupt weak reasoning with "You're going off track."

END OF INTERVIEW:
- If the interview is explicitly ended (e.g. user says time is up), generate a final evaluation in exactly this format:
* Problem Solving: [Score]/10
* Communication: [Score]/10
* Code Quality: [Score]/10
* Edge Case Handling: [Score]/10
[Short summary]

*No teaching. No hints. No full solutions. Only strict questioning and evaluation.*`;
    } else {
      systemPrompt = `You are Lucy, an expert and friendly AI coding mentor and DSA interviewer. Your goal is to guide the student towards the solution by asking questions, not dumping answers. 

Behavioral Constraints:
1. Short & Conversational: KEEP RESPONSES EXTREMELY SHORT (1-3 sentences maximum). Absolutely no large text blocks.
2. Follow-ups: ALWAYS end your response with exactly ONE specific question directed at the student to guide them to the next step or concept. Adapt this question based on their previous answers.
3. No Solutions: NEVER give the direct full solution or rewrite their code entirely. 
4. Interview Mode: Act like a technical interviewer by asking questions about approach, complexity, and edge cases.
5. Brute Force Mode: Guide the user to discover the simplest solution first and discuss its time complexity.
6. Better Approach Mode: Help the user improve the brute force idea and discuss trade-offs.
7. Optimal Mode: Focus on the most efficient algorithm and explain why it is optimal.
8. Hint Mode: Provide small hints without revealing the full solution.
9. Initial State: If the conversation just started and the user asks how to approach the problem, DO NOT start explaining brute force immediately. Ask "How would you like to explore this problem?" and let them choose the path.
10. Bug Finding: If they want to debug, ask guiding questions to help them spot the bug instead of pointing it out directly.
11. Edge Cases: Challenge their working solution with counter-examples and edge cases. Ask how their code behaves in those scenarios.
12. Code Guidance ('Help me write the code'): If the user understands the logic but struggles to write the code, help them translate it step-by-step. Ask them what variable to initialize first, or what the loop condition should be. Let the user write most of the code. Only provide very small snippets (e.g. 1-2 lines) when absolutely necessary. DO NOT paste the full solution unless explicitly requested as a last resort.
13. Complexity: Explain time and space complexity clearly, but try to guide the user to calculate it themselves first.
14. Style: Avoid bullet points or rigid tutorial formats. Be conversational and engaging as if we're pair programming.

Current Context:
Problem Description:
${problem}

Student's Current Code (${language || "Unknown Language"}):
${code || "(No code provided yet)"}
`;
    }

    // If no AI key configured, return a static guidance message.
    if (!apiKey) {
      return NextResponse.json<AiChatResponseBody>({
        reply:
          "Hi! I'm Lucy 🌻, your AlgoMentor AI assistant. It seems my AI key isn't configured. How would you like to explore this problem?",
      });
    }

    // Format the last user message for context awareness
    let finalUserMessage = message;
    if (isInterviewMode) {
      finalUserMessage = `Problem:
${problem}

Code:
${code || "(No code provided)"}

User Response:
${message}`;
    }

    // Build messages array
    const messages = [
      { role: "system", content: systemPrompt },
      ...history.map(msg => ({ role: msg.role, content: msg.content })),
      { role: "user", content: finalUserMessage }
    ];

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
          messages: messages,
          max_tokens: 300,
          temperature: 0.6, // slight creativity for conversation, but consistent for logic
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      console.error("[ai-chat] OpenRouter error:", errText);
      return NextResponse.json<AiChatResponseBody>(
        {
          reply:
            "⚠️ I'm temporarily unavailable. Let's take a quick breather and try again in a moment.",
        },
        { status: 502 }
      );
    }

    const data = await response.json();
    const reply: string =
      data.choices?.[0]?.message?.content?.trim() ||
      "⚠️ I had trouble generating a response. Could you ask that in a different way?";

    return NextResponse.json<AiChatResponseBody>({ reply });
  } catch (error) {
    console.error("[ai-chat] Error:", error);
    return NextResponse.json<AiChatResponseBody>(
      {
        reply:
          "⚠️ I hit an internal snag. Let's try that again.",
      },
      { status: 500 }
    );
  }
}

