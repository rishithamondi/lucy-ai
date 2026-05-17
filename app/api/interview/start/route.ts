import { NextRequest, NextResponse } from "next/server";
import { FlowManager } from "@/lib/interview/flowManager";
import { StartInterviewRequest } from "@/types/interview";

export async function POST(req: NextRequest) {
  try {
    const body: StartInterviewRequest = await req.json();

    if (!body.problemTitle || !body.problemDescription) {
      return NextResponse.json({ error: "Problem title and description are required" }, { status: 400 });
    }

    const session = await FlowManager.startSession(body);
    return NextResponse.json(session);
  } catch (error) {
    console.error("[API_INTERVIEW_START] Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
