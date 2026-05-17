import { 
  InterviewSession, 
  InterviewPhase, 
  InterviewMessage,
  StartInterviewRequest,
  InterviewEvaluation,
  EvaluationCategory,
  InterviewEvidence
} from "@/types/interview";
import { sessionStore } from "./sessionStore";
import { generateInterviewerResponse } from "./ai/interviewer";
import { v4 as uuidv4 } from "uuid";

export class FlowManager {
  
  public static async startSession(config: StartInterviewRequest): Promise<InterviewSession> {
    const sessionId = uuidv4();
    
    const initialEvaluation: InterviewEvaluation = {
      scores: {
        problemSolving: 5,
        communication: 5,
        optimization: 5,
        debugging: 5,
        codeQuality: 5,
        confidence: 5,
      },
      strengths: [],
      weaknesses: [],
      notes: [],
    };

    const session: InterviewSession = {
      sessionId,
      problem: {
        title: config.problemTitle,
        description: config.problemDescription,
        difficulty: config.difficulty,
      },
      duration: config.duration || 25,
      interviewerType: config.interviewerType || "technical",
      interviewerPersonality: config.interviewerPersonality || "neutral",
      currentPhase: "introduction",
      messages: [],
      submissions: [],
      evaluation: initialEvaluation,
      evidence: {
        messageCount: 0,
        totalLength: 0,
        submissionCount: 0,
        complexityDiscussed: false,
        optimizationDiscussed: false,
        approachExplained: false,
        debuggingOccurred: false,
        edgeCasesMentioned: false,
        totalTestCases: 0,
        passedTestCases: 0,
        failedTestCases: 0,
        compilationFailures: 0,
        runtimeFailures: 0,
        executionAttempts: 0,
        retryCount: 0,
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    // Generate initial greeting
    const response = await generateInterviewerResponse(
      sessionId,
      "introduction",
      session.interviewerType,
      session.interviewerPersonality,
      session.problem.difficulty,
      session.problem.title,
      session.problem.description,
      [],
      "Start the interview."
    );

    session.messages.push({
      role: "assistant",
      content: response.reply,
      timestamp: Date.now()
    });
    session.currentPhase = response.nextPhase;

    sessionStore.saveSession(session);
    return session;
  }

  public static async processMessage(sessionId: string, userMessage: string, currentCode?: string): Promise<InterviewMessage & { nextPhase: InterviewPhase; evaluation: InterviewEvaluation; evidence: InterviewEvidence }> {
    const session = sessionStore.getSession(sessionId);
    if (!session) throw new Error("Session not found");

    // Add user message to history
    const userMsg: InterviewMessage = {
      role: "user",
      content: userMessage,
      timestamp: Date.now()
    };
    session.messages.push(userMsg);

    // Generate AI response with code context
    const aiResponse = await generateInterviewerResponse(
      sessionId,
      session.currentPhase,
      session.interviewerType,
      session.interviewerPersonality,
      session.problem.difficulty,
      session.problem.title,
      session.problem.description,
      session.messages.slice(0, -1),
      userMessage,
      currentCode
    );

    // Update evidence metrics
    session.evidence.messageCount += 1;
    session.evidence.totalLength += userMessage.length;

    // Update session phase based on AI intent
    session.currentPhase = aiResponse.nextPhase;

    // Update evidence flags from AI detection
    if (aiResponse.evidenceDetected) {
      session.evidence.complexityDiscussed = session.evidence.complexityDiscussed || aiResponse.evidenceDetected.complexityDiscussed;
      session.evidence.optimizationDiscussed = session.evidence.optimizationDiscussed || aiResponse.evidenceDetected.optimizationDiscussed;
      session.evidence.approachExplained = session.evidence.approachExplained || aiResponse.evidenceDetected.approachExplained;
      session.evidence.debuggingOccurred = session.evidence.debuggingOccurred || aiResponse.evidenceDetected.debuggingOccurred;
      session.evidence.edgeCasesMentioned = session.evidence.edgeCasesMentioned || aiResponse.evidenceDetected.edgeCasesMentioned;
    }

    // Update evaluation scores if provided
    if (aiResponse.evaluationUpdate) {
      const { category, scoreDelta, reason } = aiResponse.evaluationUpdate;
      if (category && session.evaluation.scores[category] !== undefined) {
        const currentScore = session.evaluation.scores[category];
        const newScore = Math.max(0, Math.min(10, currentScore + (scoreDelta || 0)));
        session.evaluation.scores[category] = newScore;
        session.evaluation.notes.push(`${category.toUpperCase()} updated: ${reason} (Score: ${newScore})`);
      }
    }

    const assistantMsg: InterviewMessage = {
      role: "assistant",
      content: aiResponse.reply,
      timestamp: Date.now()
    };
    session.messages.push(assistantMsg);
    
    sessionStore.saveSession(session);
    
    return {
        ...assistantMsg,
        nextPhase: session.currentPhase,
        evaluation: session.evaluation,
        evidence: session.evidence
    };
  }

  public static async submitCode(sessionId: string, code: string, language: string, results?: { passed: boolean; total?: number; passedCount?: number; error?: string; isCompilationError?: boolean }) {
    const session = sessionStore.getSession(sessionId);
    if (!session) throw new Error("Session not found");

    session.submissions.push({
      code,
      language,
      timestamp: Date.now(),
      results: results ? {
        passed: results.passed,
        output: results.error || "Execution successful",
        error: results.error
      } : undefined
    });

    // Update Evidence
    session.evidence.submissionCount += 1;
    session.evidence.executionAttempts += 1;
    
    if (results) {
      if (results.total) session.evidence.totalTestCases = results.total;
      if (results.passedCount !== undefined) session.evidence.passedTestCases = results.passedCount;
      if (results.total && results.passedCount !== undefined) {
        session.evidence.failedTestCases = results.total - results.passedCount;
      }

      if (results.error) {
        if (results.isCompilationError) {
          session.evidence.compilationFailures += 1;
        } else {
          session.evidence.runtimeFailures += 1;
        }
      }

      if (!results.passed) {
        session.evidence.retryCount += 1;
      }
    }

    session.evidence.lastSubmissionTimestamp = Date.now();

    // AUTOMATIC REACTION: Generate AI response after code submission
    const aiResponse = await generateInterviewerResponse(
      sessionId,
      session.currentPhase === "coding" ? "review" : session.currentPhase, // Move to review if in coding
      session.interviewerType,
      session.interviewerPersonality,
      session.problem.difficulty,
      session.problem.title,
      session.problem.description,
      session.messages,
      `I have just submitted my code. Execution results: ${results?.passed ? "Passed all tests" : "Failed some tests"}. ${results?.error ? `Error: ${results.error}` : ""}. Analyze my implementation and provide feedback or follow-up questions.`,
      code
    );

    // Update session with AI feedback
    session.currentPhase = aiResponse.nextPhase;
    
    if (aiResponse.evidenceDetected) {
      session.evidence.complexityDiscussed = session.evidence.complexityDiscussed || aiResponse.evidenceDetected.complexityDiscussed;
      session.evidence.optimizationDiscussed = session.evidence.optimizationDiscussed || aiResponse.evidenceDetected.optimizationDiscussed;
      session.evidence.approachExplained = session.evidence.approachExplained || aiResponse.evidenceDetected.approachExplained;
      session.evidence.debuggingOccurred = session.evidence.debuggingOccurred || aiResponse.evidenceDetected.debuggingOccurred;
      session.evidence.edgeCasesMentioned = session.evidence.edgeCasesMentioned || aiResponse.evidenceDetected.edgeCasesMentioned;
    }

    if (aiResponse.evaluationUpdate) {
      const { category, scoreDelta, reason } = aiResponse.evaluationUpdate;
      if (category && session.evaluation.scores[category] !== undefined) {
        const currentScore = session.evaluation.scores[category];
        const newScore = Math.max(0, Math.min(10, currentScore + (scoreDelta || 0)));
        session.evaluation.scores[category] = newScore;
        session.evaluation.notes.push(`${category.toUpperCase()} updated (post-submission): ${reason} (Score: ${newScore})`);
      }
    }

    session.messages.push({
      role: "assistant",
      content: aiResponse.reply,
      timestamp: Date.now()
    });

    sessionStore.saveSession(session);
    return session;
  }
}
