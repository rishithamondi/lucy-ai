import { InterviewSession } from "@/types/interview";

declare global {
  var sessionStore: SessionStore | undefined;
}

class SessionStore {
  private sessions: Map<string, InterviewSession> = new Map();

  constructor() {
    // In-memory store for development
  }

  public saveSession(session: InterviewSession): void {
    session.updatedAt = Date.now();
    this.sessions.set(session.sessionId, session);
  }

  public getSession(sessionId: string): InterviewSession | undefined {
    return this.sessions.get(sessionId);
  }

  public deleteSession(sessionId: string): boolean {
    return this.sessions.delete(sessionId);
  }

  public getAllSessions(): InterviewSession[] {
    return Array.from(this.sessions.values());
  }

  public cleanup(maxAgeMs: number = 3600000): void {
    const now = Date.now();
    for (const [id, session] of this.sessions.entries()) {
      if (now - session.updatedAt > maxAgeMs) {
        this.sessions.delete(id);
      }
    }
  }
}

// Singleton initialization with hot-reload protection
export const sessionStore = global.sessionStore || new SessionStore();

if (process.env.NODE_ENV !== "production") {
  global.sessionStore = sessionStore;
}
