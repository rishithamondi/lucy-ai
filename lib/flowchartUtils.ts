/**
 * Sanitize a step label for Mermaid: remove characters that break parsing
 * (e.g. [] == && > < " ' () ) and collapse spaces. Keeps labels short and safe.
 */
export function sanitizeMermaidLabel(step: string): string {
  return step
    .replace(/[\[\](){}==&<>|!'"]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .substring(0, 50) || "Step";
}

/**
 * Build Mermaid flowchart TD syntax from an ordered list of steps.
 * Uses node IDs N0, N1, ... and parentheses N0(Label) to avoid parse errors.
 * Labels are sanitized so expressions like nums[i] or i > 0 never reach Mermaid.
 */
export function buildMermaidFromSteps(steps: string[]): string {
  if (steps.length === 0) return "flowchart TD\n  A(No steps)";

  const lines: string[] = ["flowchart TD"];
  const ids: string[] = [];

  for (let i = 0; i < steps.length; i++) {
    const id = `N${i}`;
    ids.push(id);
    const label = sanitizeMermaidLabel(steps[i]);
    // Parentheses (label) avoid quote/bracket escaping issues
    lines.push(`  ${id}(${label})`);
  }

  for (let i = 0; i < steps.length - 1; i++) {
    lines.push(`  ${ids[i]} --> ${ids[i + 1]}`);
  }

  return lines.join("\n");
}
