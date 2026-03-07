/**
 * Parse "name = value" or "name = value, name2 = value2" into list of value expressions.
 * Example: "nums = [2, 7, 11, 15], target = 9" -> ["[2, 7, 11, 15]", "9"]
 */
export function parseExampleInput(inputStr: string): string[] {
  const trimmed = inputStr.trim();
  if (!trimmed) return [];
  const parts = trimmed.split(/\s*,\s*/);
  return parts.map((p) => {
    const eq = p.indexOf("=");
    if (eq === -1) return p.trim();
    return p.slice(eq + 1).trim();
  });
}

/** Extract Python function name from code: def function_name( */
export function extractPythonFunctionName(code: string): string | null {
  const match = code.match(/\bdef\s+(\w+)\s*\(/);
  return match ? match[1] : null;
}

/** Extract Java class name and method name from code. */
export function extractJavaClassAndMethod(
  code: string
): { className: string; methodName: string } | null {
  const classMatch = code.match(/\bclass\s+(\w+)\s*\{/);
  const methodMatch = code.match(/public\s+(?:static\s+)?\w+\s+(\w+)\s*\(/);
  const className = classMatch ? classMatch[1] : "Solution";
  const methodName = methodMatch ? methodMatch[1] : null;
  if (!methodName) return null;
  return { className, methodName };
}

/**
 * Convert a single argument expression for Java (e.g. "[2, 7, 11, 15]" -> "new int[]{2, 7, 11, 15}").
 */
function toJavaArgExpr(arg: string): string {
  const t = arg.trim();
  if (t.startsWith("[") && t.endsWith("]")) {
    const inner = t.slice(1, -1).trim();
    return `new int[]{${inner}}`;
  }
  return t;
}

/**
 * Build Python runner: user code + lines that print function result for each test case.
 */
export function buildPythonRunner(
  userCode: string,
  fnName: string,
  examples: Array<{ input: string; output: string }>
): string {
  const lines: string[] = [];
  for (const ex of examples) {
    const args = parseExampleInput(ex.input);
    if (args.length === 0) continue;
    const call = `${fnName}(${args.join(", ")})`;
    lines.push(`print(${call})`);
  }
  if (lines.length === 0) return userCode;
  return `${userCode}\n\n# Runner\n${lines.join("\n")}`;
}

/**
 * Build Java runner: user class + a Runner class with main that invokes the solution for each test case.
 */
export function buildJavaRunner(
  userCode: string,
  className: string,
  methodName: string,
  examples: Array<{ input: string; output: string }>
): string {
  const printLines: string[] = [];
  for (const ex of examples) {
    const args = parseExampleInput(ex.input).map(toJavaArgExpr);
    if (args.length === 0) continue;
    const call = `sol.${methodName}(${args.join(", ")})`;
    printLines.push(`System.out.println(${call});`);
  }
  if (printLines.length === 0) return userCode;
  const runnerMain = `
class Runner {
    public static void main(String[] args) {
        ${className} sol = new ${className}();
        ${printLines.join("\n        ")}
    }
}`;
  return `${userCode}\n${runnerMain}`;
}

/** Normalize output for comparison (trim, collapse spaces). */
export function normalizeOutput(s: string): string {
  return String(s).trim().replace(/\s+/g, " ");
}

export function outputsMatch(actual: string, expected: string): boolean {
  return normalizeOutput(actual) === normalizeOutput(expected);
}
