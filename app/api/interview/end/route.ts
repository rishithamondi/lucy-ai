import { NextRequest, NextResponse } from "next/server";
import { sessionStore } from "@/lib/interview/sessionStore";
import { generateFinalEvaluation } from "@/lib/interview/ai/interviewer";

export async function POST(req: NextRequest) {
  try {
    const { sessionId } = await req.json();

    if (!sessionId) {
      return NextResponse.json({ error: "Session ID is required" }, { status: 400 });
    }

    const session = sessionStore.getSession(sessionId);
    if (!session) {
      return NextResponse.json({ 
        error: "SESSION_EXPIRED", 
        message: "Interview session no longer exists. Please restart." 
      }, { status: 404 });
    }

    // Move to evaluation phase
    session.currentPhase = "evaluation";
    
    const evaluation = await generateFinalEvaluation(
      session.problem.title,
      session.messages,
      session.submissions,
      session.evaluation,
      session.evidence
    );

    // In a real app, we might persist this evaluation to a database
    // For now, we just return it and potentially clean up the session
    // sessionStore.deleteSession(sessionId); 

    return NextResponse.json({
      evaluation,
      session
    });
  } catch (error) {
    console.error("[API_INTERVIEW_END] Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
