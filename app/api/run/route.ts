import { NextRequest, NextResponse } from "next/server";

const JDOODLE_URL = "https://api.jdoodle.com/v1/execute";

type RunRequestBody = {
  language?: string;
  code?: string;
};

type JdoodleResponse = {
  output?: string;
  error?: string;
  statusCode?: number;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as RunRequestBody;
    const { language, code } = body;

    if (!language || !code) {
      return NextResponse.json(
        { output: "Missing language or code" },
        { status: 400 }
      );
    }

    const clientId = process.env.JDOODLE_CLIENT_ID;
    const clientSecret = process.env.JDOODLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      console.error("[run] Missing JDoodle credentials");
      return NextResponse.json(
        { output: "Execution service error" },
        { status: 500 }
      );
    }

    // JDoodle expects specific language identifiers, e.g. "python3" instead of "python".
    const jdoodleLanguage =
      language === "python" ? "python3" : language;

    const payload = {
      clientId,
      clientSecret,
      script: code,
      language: jdoodleLanguage,
      versionIndex: "0",
    };

    let jdoodleRes: Response;
    try {
      jdoodleRes = await fetch(JDOODLE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch (err) {
      console.error("[run] JDoodle request error:", err);
      return NextResponse.json(
        { output: "Execution service error" },
        { status: 502 }
      );
    }

    if (!jdoodleRes.ok) {
      const text = await jdoodleRes.text().catch(() => "");
      console.error("[run] JDoodle non-OK:", jdoodleRes.status, text);
      return NextResponse.json(
        { output: "Execution service error" },
        { status: 502 }
      );
    }

    let jdoodleBody: JdoodleResponse;
    try {
      jdoodleBody = (await jdoodleRes.json()) as JdoodleResponse;
    } catch (err) {
      console.error("[run] Failed to parse JDoodle response:", err);
      return NextResponse.json(
        { output: "Execution service error" },
        { status: 502 }
      );
    }

    const rawOutput = jdoodleBody.output ?? jdoodleBody.error ?? "";
    const output = typeof rawOutput === "string" ? rawOutput : String(rawOutput);

    return NextResponse.json({ output });
  } catch (error) {
    console.error("[run] Error:", error);
    return NextResponse.json(
      { output: "Execution service error" },
      { status: 500 }
    );
  }
}
