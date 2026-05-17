import { 
  InterviewMessage, 
  InterviewPhase, 
  InterviewerType, 
  EvaluationCategory,
  InterviewEvaluation,
  InterviewerPersonality
} from "@/types/interview";
import { getSystemPrompt, EVALUATION_PROMPT } from "../prompts/templates";

export interface InterviewAiResponse {
  reply: string;
  nextPhase: InterviewPhase;
  confidence?: number;
  evaluationUpdate?: {
    category: EvaluationCategory;
    scoreDelta: number;
    reason: string;
  };
  evidenceDetected?: {
    complexityDiscussed: boolean;
    optimizationDiscussed: boolean;
    approachExplained: boolean;
    debuggingOccurred: boolean;
    edgeCasesMentioned: boolean;
  };
}

export async function generateInterviewerResponse(
  sessionId: string,
  phase: InterviewPhase,
  interviewerType: InterviewerType,
  personality: InterviewerPersonality,
  difficulty: "easy" | "medium" | "hard",
  problemTitle: string,
  problemDescription: string,
  history: InterviewMessage[],
  userMessage: string,
  currentCode?: string
): Promise<InterviewAiResponse> {
  const apiKey = process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return {
      reply: "Interviewer: (API Key not configured. Please check your environment variables.)",
      nextPhase: phase
    };
  }

  const systemPrompt = getSystemPrompt(phase, interviewerType, personality, difficulty, problemTitle, problemDescription, currentCode);

  const messages = [
    { role: "system", content: systemPrompt },
    ...history.map(msg => ({ role: msg.role, content: msg.content })),
    { role: "user", content: userMessage }
  ];

  try {
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
          messages: messages,
          max_tokens: 500,
          temperature: 0.5,
          response_format: { type: "json_object" }
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`AI Service Error: ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim() || "{}";
    
    try {
      const parsed = JSON.parse(content);
      return {
        reply: parsed.reply || "I'm sorry, I couldn't process that.",
        nextPhase: parsed.nextPhase || phase,
        confidence: parsed.confidence,
        evaluationUpdate: parsed.evaluationUpdate,
        evidenceDetected: parsed.evidenceDetected
      };
    } catch (parseError) {
      console.error("[InterviewerAI] JSON Parse Error:", parseError, "Content:", content);
      return {
        reply: content,
        nextPhase: phase
      };
    }
  } catch (error) {
    console.error("[InterviewerAI] Error:", error);
    return {
      reply: "I'm having some trouble connecting right now. Let's try again in a moment.",
      nextPhase: phase
    };
  }
}

export async function generateFinalEvaluation(
  problemTitle: string,
  history: InterviewMessage[],
  submissions: any[],
  evaluationState: InterviewEvaluation,
  evidence: any
): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) return "Evaluation unavailable without API key.";

  const prompt = `
Interview for: ${problemTitle}
Final Scores: ${JSON.stringify(evaluationState.scores)}
Interaction Evidence: ${JSON.stringify(evidence)}
Conversation History Snippet: (Analyze the tone and depth of candidate responses from history)
`;

  try {
    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "openai/gpt-4o-mini",
          messages: [
            { role: "system", content: EVALUATION_PROMPT }, 
            { role: "user", content: prompt }
          ],
          max_tokens: 1000,
          temperature: 0.3,
        }),
      }
    );
    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      console.error("[InterviewerAI] Final Eval API Error:", response.status, errData);
      return `Evaluation service error: ${response.statusText}`;
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content?.trim() || "Evaluation generation failed.";
  } catch (err) {
    return "Failed to generate evaluation due to connection error.";
  }
}
