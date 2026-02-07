// Context Assembly -- Spec 01 & 13
// Loads clinical corpus files and provides context formatting utilities

import type { ContextPayload } from "./types.ts";

// Valid corpus agent types -- restricts directory traversal to known paths
const VALID_AGENT_TYPES = new Set([
  "clinical-safety",
  "boundary",
  "regulation",
  "escalation",
]);

// Maximum file size for a single corpus file (1 MB)
const MAX_CORPUS_FILE_BYTES = 1_048_576;

// Module-level cache: loaded once on cold start, reused across requests
const corpusCache = new Map<string, string>();

/**
 * Resolve the base path for corpus files.
 * In Supabase Edge Functions, use CWD-relative path.
 * Override with VIGIL_CORPUS_PATH env var for testing.
 */
function getCorpusBasePath(): string {
  return Deno.env.get("VIGIL_CORPUS_PATH") ?? "./corpus";
}

/**
 * Load all .md files from a corpus directory and concatenate them.
 * Results are cached in module-level Map for the lifetime of the function instance.
 *
 * Security: Only accepts known agent types (prevents directory traversal).
 * Files exceeding MAX_CORPUS_FILE_BYTES are skipped with a warning.
 *
 * @param agentType - Directory name under corpus/ (e.g., "clinical-safety", "boundary")
 * @returns Concatenated corpus text, or empty string if directory doesn't exist
 */
export function loadCorpus(agentType: string): string {
  if (!VALID_AGENT_TYPES.has(agentType)) {
    console.warn(
      `[context-assembly] Unknown agent type: ${agentType}. Valid types: ${[...VALID_AGENT_TYPES].join(", ")}`,
    );
    return "";
  }

  if (corpusCache.has(agentType)) {
    return corpusCache.get(agentType)!;
  }

  const basePath = getCorpusBasePath();
  const dirPath = `${basePath}/${agentType}`;
  let corpus = "";

  try {
    for (const entry of Deno.readDirSync(dirPath)) {
      if (entry.isFile && entry.name.endsWith(".md")) {
        const filePath = `${dirPath}/${entry.name}`;
        try {
          const stat = Deno.statSync(filePath);
          if (stat.size > MAX_CORPUS_FILE_BYTES) {
            console.warn(
              `[context-assembly] Skipping oversized file ${filePath}: ${stat.size} bytes (limit: ${MAX_CORPUS_FILE_BYTES})`,
            );
            continue;
          }
          const content = Deno.readTextFileSync(filePath);
          corpus += `\n\n---\n## [${entry.name}]\n\n${content}`;
        } catch (fileError) {
          console.warn(
            `[context-assembly] Failed to read ${filePath}:`,
            fileError,
          );
        }
      }
    }
  } catch (dirError) {
    console.warn(
      `[context-assembly] Corpus directory not found: ${dirPath}`,
      dirError,
    );
    corpus = "";
  }

  corpusCache.set(agentType, corpus);
  return corpus;
}

/**
 * Build a complete system prompt by appending corpus material from a single agent type.
 */
export function buildSystemPrompt(
  basePrompt: string,
  agentType: string,
): string {
  const corpus = loadCorpus(agentType);
  if (!corpus) return basePrompt;
  return `${basePrompt}\n\n## CLINICAL CORPUS REFERENCE\n${corpus}`;
}

/**
 * Build a system prompt with corpus material from multiple agent types.
 * Used by the Rewrite Agent, which references findings from all agents.
 */
export function buildMultiCorpusPrompt(
  basePrompt: string,
  agentTypes: string[],
): string {
  const allCorpus = agentTypes
    .map((t) => loadCorpus(t))
    .filter(Boolean)
    .join("\n\n");
  if (!allCorpus) return basePrompt;
  return `${basePrompt}\n\n## CLINICAL CORPUS REFERENCE\n${allCorpus}`;
}

/**
 * Format a ContextPayload as a JSON user message for agent consumption.
 * Shared across all review agents (clinical-safety, boundary, regulation, escalation).
 */
export function formatUserMessage(context: ContextPayload): string {
  return JSON.stringify(
    {
      user_message: context.user_message,
      ai_response: context.ai_response,
      conversation_history: context.conversation_history,
      session_metadata: context.session_metadata,
    },
    null,
    2,
  );
}
