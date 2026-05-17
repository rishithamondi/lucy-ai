export type InterviewPhase = "introduction" | "discussion" | "coding" | "review" | "evaluation";

export type InterviewerType = "technical" | "behavioral" | "managerial";

export type InterviewerPersonality = "supportive" | "neutral" | "strict" | "rapid-fire" | "mentor";

export interface InterviewMessage {
  role: "assistant" | "user" | "system";
  content: string;
  timestamp: number;
}

export interface CodeSubmission {
  code: string;
  language: string;
  timestamp: number;
  results?: {
    passed: boolean;
    output: string;
    error?: string;
  };
}

export type EvaluationCategory = "problemSolving" | "communication" | "optimization" | "debugging" | "codeQuality" | "confidence";

export interface InterviewEvaluation {
  scores: Record<EvaluationCategory, number>;
  strengths: string[];
  weaknesses: string[];
  notes: string[];
}

export interface InterviewEvidence {
  messageCount: number;
  totalLength: number;
  submissionCount: number;
  complexityDiscussed: boolean;
  optimizationDiscussed: boolean;
  approachExplained: boolean;
  debuggingOccurred: boolean;
  edgeCasesMentioned: boolean;
  // Execution evidence
  totalTestCases: number;
  passedTestCases: number;
  failedTestCases: number;
  compilationFailures: number;
  runtimeFailures: number;
  executionAttempts: number;
  retryCount: number;
  lastSubmissionTimestamp?: number;
}

export interface InterviewSession {
  sessionId: string;
  problem: {
    title: string;
    description: string;
    difficulty: "easy" | "medium" | "hard";
  };
  duration: number; // in minutes
  interviewerType: InterviewerType;
  interviewerPersonality: InterviewerPersonality;
  currentPhase: InterviewPhase;
  messages: InterviewMessage[];
  submissions: CodeSubmission[];
  evaluation: InterviewEvaluation;
  evidence: InterviewEvidence;
  createdAt: number;
  updatedAt: number;
}

export interface StartInterviewRequest {
  problemTitle: string;
  problemDescription: string;
  difficulty: "easy" | "medium" | "hard";
  interviewerType?: InterviewerType;
  interviewerPersonality?: InterviewerPersonality;
  duration?: number;
}

export interface InterviewMessageRequest {
  sessionId: string;
  message: string;
  currentCode?: string;
}

export interface InterviewSubmitRequest {
  sessionId: string;
  code: string;
  language: string;
  results?: {
    passed: boolean;
    total?: number;
    passedCount?: number;
    error?: string;
    isCompilationError?: boolean;
  };
}
