import { useState, useEffect, useCallback, useRef } from "react";
import { 
  InterviewSession, 
  InterviewPhase, 
  InterviewMessage, 
  StartInterviewRequest,
  InterviewEvaluation,
  InterviewEvidence
} from "@/types/interview";

export function useInterview() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [phase, setPhase] = useState<InterviewPhase>("introduction");
  const [messages, setMessages] = useState<InterviewMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isInterviewActive, setIsInterviewActive] = useState(false);
  const [evaluation, setEvaluation] = useState<string | null>(null);
  const [evaluationState, setEvaluationState] = useState<InterviewEvaluation | null>(null);
  const [evidence, setEvidence] = useState<InterviewEvidence | null>(null);
  const [isExpired, setIsExpired] = useState(false);
  const [showReport, setShowReport] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const openInterview = useCallback(() => setIsInterviewActive(true), []);

  // Timer logic
  useEffect(() => {
    if (isInterviewActive && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isInterviewActive, timeLeft]);

  const startInterview = useCallback(async (config: StartInterviewRequest) => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/interview/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });

      if (!res.ok) throw new Error("Failed to start interview");

      const data: InterviewSession = await res.json();
      setSessionId(data.sessionId);
      setPhase(data.currentPhase);
      setMessages(data.messages);
      setEvaluationState(data.evaluation);
      setEvidence(data.evidence);
      setTimeLeft(data.duration * 60);
      setIsInterviewActive(true);
      setEvaluation(null);
      setShowReport(false);
      setIsExpired(false);
    } catch (error) {
      console.error("[useInterview] Error starting interview:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const sendMessage = useCallback(async (message: string, currentCode?: string) => {
    if (!sessionId) return;
    
    // Optimistically add user message
    const userMsg: InterviewMessage = {
      role: "user",
      content: message,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const res = await fetch("/api/interview/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, message, currentCode }),
      });

      const result = await res.json();

      if (!res.ok) {
        if (result.error === "SESSION_EXPIRED") {
          setIsExpired(true);
        }
        throw new Error(result.message || "Failed to send message");
      }
      const aiMsg: InterviewMessage = {
        role: result.role,
        content: result.content,
        timestamp: result.timestamp
      };
      
      setMessages((prev) => [...prev, aiMsg]);
      setPhase(result.nextPhase);
      if (result.evaluation) {
        setEvaluationState(result.evaluation);
      }
      if (result.evidence) {
        setEvidence(result.evidence);
      }
    } catch (error) {
      console.error("[useInterview] Error sending message:", error);
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  const submitCode = useCallback(async (code: string, language: string) => {
    if (!sessionId) return;
    setIsLoading(true);

    try {
      // 1. Execute code first to get results
      const runRes = await fetch("/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, language }),
      });
      
      const runData = await runRes.json();
      
      // Basic heuristic for test cases (if we don't have a real test runner)
      // In a production app, we would run actual unit tests here.
      const passed = !runData.error && !runData.output?.toLowerCase().includes("error");
      
      // Mocking test results based on output for now
      const results = {
        passed: passed,
        total: 5,
        passedCount: passed ? 5 : 2, // Simulated pass rate
        error: runData.error || (passed ? null : runData.output),
        isCompilationError: runData.output?.toLowerCase().includes("compile") || runData.output?.toLowerCase().includes("syntax error")
      };

      // 2. Submit results to interview session
      const res = await fetch("/api/interview/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, code, language, results }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.error === "SESSION_EXPIRED") {
          setIsExpired(true);
        }
        throw new Error(data.message || "Failed to submit code");
      }

      setPhase(data.currentPhase);
      setMessages(data.messages);
      if (data.evidence) {
        setEvidence(data.evidence);
      }
    } catch (error) {
      console.error("[useInterview] Error submitting code:", error);
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  const endInterview = useCallback(async () => {
    if (!sessionId) {
        setIsInterviewActive(false);
        return;
    }
    setIsLoading(true);
    setPhase("evaluation");

    try {
      const res = await fetch("/api/interview/end", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.error === "SESSION_EXPIRED") {
          setIsExpired(true);
        }
        throw new Error(data.message || "Failed to end interview");
      }
      setEvaluation(data.evaluation);
      setEvaluationState(data.session.evaluation);
      setEvidence(data.session.evidence);
      setPhase(data.session.currentPhase);
      setShowReport(true);
    } catch (error) {
      console.error("[useInterview] Error ending interview:", error);
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  const exitInterview = useCallback(() => {
    setIsInterviewActive(false);
    setSessionId(null);
    setMessages([]);
    setPhase("introduction");
    setEvaluation(null);
    setEvaluationState(null);
    setEvidence(null);
    setShowReport(false);
  }, []);

  return {
    sessionId,
    phase,
    messages,
    isLoading,
    timeLeft,
    isInterviewActive,
    evaluation,
    evaluationState,
    evidence,
    isExpired,
    showReport,
    startInterview,
    sendMessage,
    submitCode,
    endInterview,
    exitInterview,
    openInterview,
  };
}
