import { NextRequest, NextResponse } from "next/server";
import { FlowManager } from "@/lib/interview/flowManager";
import { InterviewMessageRequest } from "@/types/interview";

export async function POST(req: NextRequest) {
  try {
    const { sessionId, message, currentCode } = await req.json();

    if (!sessionId || !message) {
      return NextResponse.json({ error: "Session ID and message are required" }, { status: 400 });
    }

    const result = await FlowManager.processMessage(sessionId, message, currentCode);
    return NextResponse.json(result);
  } catch (error) {
    console.error("[API_INTERVIEW_MESSAGE] Error:", error);
    if (error instanceof Error && error.message === "Session not found") {
      return NextResponse.json({ 
        error: "SESSION_EXPIRED", 
        message: "Interview session no longer exists. Please restart." 
      }, { status: 404 });
    }
    return NextResponse.json({ error: "INTERNAL_ERROR", message: "Internal Server Error" }, { status: 500 });
  }
}
