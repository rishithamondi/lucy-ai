import { NextRequest, NextResponse } from "next/server";
import { FlowManager } from "@/lib/interview/flowManager";
import { InterviewSubmitRequest } from "@/types/interview";

export async function POST(req: NextRequest) {
  try {
    const body: InterviewSubmitRequest = await req.json();

    if (!body.sessionId || !body.code || !body.language) {
      return NextResponse.json({ error: "Session ID, code, and language are required" }, { status: 400 });
    }

    const updatedSession = await FlowManager.submitCode(body.sessionId, body.code, body.language, (body as any).results);
    return NextResponse.json(updatedSession);
  } catch (error) {
    console.error("[API_INTERVIEW_SUBMIT] Error:", error);
    if (error instanceof Error && error.message === "Session not found") {
      return NextResponse.json({ 
        error: "SESSION_EXPIRED", 
        message: "Interview session no longer exists. Please restart." 
      }, { status: 404 });
    }
    return NextResponse.json({ error: "INTERNAL_ERROR", message: "Internal Server Error" }, { status: 500 });
  }
}
