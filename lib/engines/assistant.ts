/**
 * ASSISTANT ENGINE
 * Architecture layer for a future AI jobsite assistant.
 * Provides safe, structured access to jobsite data for AI modules.
 * Designed to integrate with Claude API when the feature is enabled.
 */

import { supabase } from "@/lib/supabase";

export interface JobsiteContext {
  job_name: string;
  recent_notes: string[];
  recent_issues: string[];
  materials_used: string[];
  active_crew: string[];
  labor_hours_this_week: number;
  open_deliveries: number;
}

export interface AssistantRequest {
  prompt: string;
  context: JobsiteContext;
  mode: "summarize" | "analyze" | "report" | "suggest";
}

export interface AssistantResponse {
  answer: string;
  confidence: "high" | "medium" | "low";
  sources: string[];
  generated_at: string;
}

// ── Context builder ──────────────────────────────────────────────────────────

/**
 * Build structured jobsite context for a given job name.
 * This feeds the AI assistant with relevant data.
 */
export async function buildJobsiteContext(jobName: string): Promise<JobsiteContext> {
  if (!supabase) {
    return {
      job_name: jobName,
      recent_notes: [],
      recent_issues: [],
      materials_used: [],
      active_crew: [],
      labor_hours_this_week: 0,
      open_deliveries: 0,
    };
  }

  // Fetch recent journal entries
  const { data: logs } = await supabase
    .from("daily_logs")
    .select("work_summary, issues, materials_used")
    .eq("job_name", jobName)
    .order("log_date", { ascending: false })
    .limit(7);

  // Fetch active crew on this job
  const { data: clocked } = await supabase
    .from("time_entries")
    .select("profiles(full_name)")
    .eq("job_name", jobName)
    .is("clock_out", null);

  // Fetch open deliveries
  const { count: openDeliveries } = await supabase
    .from("deliveries")
    .select("id", { count: "exact", head: true })
    .eq("job_name", jobName)
    .eq("status", "scheduled");

  const recentNotes = (logs ?? []).map((l) => l.work_summary).filter(Boolean);
  const recentIssues = (logs ?? []).map((l) => l.issues).filter(Boolean) as string[];
  const materials = (logs ?? []).map((l) => l.materials_used).filter(Boolean) as string[];
  const activeCrew = (clocked ?? [])
    .map((e: Record<string, unknown>) => {
      const p = e.profiles;
      if (Array.isArray(p)) return p[0]?.full_name as string | undefined;
      if (p && typeof p === "object") return (p as { full_name?: string }).full_name;
      return undefined;
    })
    .filter(Boolean) as string[];

  return {
    job_name: jobName,
    recent_notes: recentNotes.slice(0, 5),
    recent_issues: recentIssues.slice(0, 5),
    materials_used: materials.slice(0, 5),
    active_crew: activeCrew,
    labor_hours_this_week: 0, // populated by analytics engine when needed
    open_deliveries: openDeliveries ?? 0,
  };
}

// ── Assistant dispatcher ─────────────────────────────────────────────────────

/**
 * Send a request to the AI assistant.
 * Currently returns a stub response - wire to Claude API when ready.
 *
 * To enable: set NEXT_PUBLIC_ASSISTANT_ENABLED=true and configure
 * the Claude API key in the server-side environment.
 */
export async function askAssistant(request: AssistantRequest): Promise<AssistantResponse> {
  // Future: call /api/assistant with the request payload
  // The API route will use the Claude API (claude-sonnet-4-6) to process

  return {
    answer: `[Assistant Engine] Ready. Job: ${request.context.job_name}. Mode: ${request.mode}. Connect Claude API to enable AI responses.`,
    confidence: "low",
    sources: ["assistant.ts stub"],
    generated_at: new Date().toISOString(),
  };
}

// ── Prompt builders ──────────────────────────────────────────────────────────

export function buildSummaryPrompt(ctx: JobsiteContext): string {
  return `Summarize the recent activity for jobsite "${ctx.job_name}":
- Recent notes: ${ctx.recent_notes.join("; ") || "none"}
- Issues reported: ${ctx.recent_issues.join("; ") || "none"}
- Materials used: ${ctx.materials_used.join("; ") || "none"}
- Active crew: ${ctx.active_crew.join(", ") || "none"}
- Open deliveries: ${ctx.open_deliveries}

Provide a concise 2-3 sentence jobsite status summary.`;
}

export function buildIssueAnalysisPrompt(ctx: JobsiteContext): string {
  if (ctx.recent_issues.length === 0) return `No issues reported for "${ctx.job_name}".`;
  return `Analyze these issues reported at jobsite "${ctx.job_name}" and suggest solutions:
${ctx.recent_issues.map((i, n) => `${n + 1}. ${i}`).join("\n")}

Identify patterns and provide actionable recommendations.`;
}
