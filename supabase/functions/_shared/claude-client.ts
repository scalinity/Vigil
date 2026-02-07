// Claude API Client Helper
// Shared by all agents for calling Claude

import Anthropic from "npm:@anthropic-ai/sdk@0.39.0";

const CLAUDE_TIMEOUT_MS = 30_000; // 30s absolute max per API call
const MAX_RETRIES = 2; // retry transient failures up to 2 times
const RETRY_BASE_MS = 1_000; // 1s base for exponential backoff

// Centralized model constants — used by all agents
export const MODEL_OPUS = "claude-opus-4-6";
export const MODEL_HAIKU = "claude-3-5-haiku-20241022";

let _client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!_client) {
    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) {
      throw new Error(
        "[claude-client] ANTHROPIC_API_KEY environment variable is not set",
      );
    }
    _client = new Anthropic({ apiKey });
  }
  return _client;
}

/** Returns true for errors that are worth retrying (network, rate limit, server errors). */
function isRetryable(error: unknown): boolean {
  if (error instanceof Anthropic.APIError) {
    // 429 rate limit, 500/502/503 server errors
    return [429, 500, 502, 503].includes(error.status);
  }
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    // Network-level failures
    return (
      msg.includes("fetch failed") ||
      msg.includes("network") ||
      msg.includes("econnreset") ||
      msg.includes("timeout")
    );
  }
  return false;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calls Claude with a system prompt and user message, expecting JSON output.
 *
 * Features:
 * - Timeout protection (30s default)
 * - Retry with exponential backoff for transient failures
 * - Input validation
 * - Markdown fence stripping with warning
 * - Sanitized error messages (no user content in thrown errors)
 *
 * @param model - MODEL_OPUS for review/rewrite agents, MODEL_HAIKU for triage
 * @param systemPrompt - Agent-specific system prompt
 * @param userMessage - The formatted context payload
 * @param maxTokens - Token budget for the response
 * @param temperature - Sampling temperature (default 0)
 * @returns Parsed JSON matching the agent's report schema
 */
export async function callClaude<T>(
  model: string,
  systemPrompt: string,
  userMessage: string,
  maxTokens: number,
  temperature = 0,
): Promise<T> {
  // Input validation
  if (!systemPrompt?.trim()) {
    throw new Error("[claude-client] systemPrompt cannot be empty");
  }
  if (!userMessage?.trim()) {
    throw new Error("[claude-client] userMessage cannot be empty");
  }
  if (maxTokens < 1 || maxTokens > 200_000) {
    throw new Error("[claude-client] maxTokens out of range (1-200000)");
  }

  const client = getClient();
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      // Race the API call against a timeout
      const response = (await Promise.race([
        client.messages.create({
          model,
          max_tokens: maxTokens,
          temperature,
          system: systemPrompt,
          messages: [{ role: "user", content: userMessage }],
        }),
        new Promise<never>((_, reject) =>
          setTimeout(
            () =>
              reject(
                new Error(`Claude API timeout after ${CLAUDE_TIMEOUT_MS}ms`),
              ),
            CLAUDE_TIMEOUT_MS,
          ),
        ),
      ])) as Anthropic.Message;

      // Extract text content
      const textBlock = response.content.find(
        (block: Anthropic.ContentBlock) => block.type === "text",
      );
      if (!textBlock || textBlock.type !== "text") {
        throw new Error("No text content in Claude response");
      }

      // Parse JSON — agents return raw JSON, no markdown
      // Strip potential markdown code fences with warning
      let jsonText = (textBlock as Anthropic.TextBlock).text.trim();
      if (jsonText.startsWith("```")) {
        console.warn(
          `[claude-client] ${model} returned markdown-wrapped JSON. Check system prompt.`,
        );
        if (jsonText.startsWith("```json")) {
          jsonText = jsonText.slice(7);
        } else {
          jsonText = jsonText.slice(3);
        }
      }
      if (jsonText.endsWith("```")) {
        jsonText = jsonText.slice(0, -3);
      }
      jsonText = jsonText.trim();

      try {
        const parsed = JSON.parse(jsonText);
        return parsed as T;
      } catch (parseError) {
        // JSON parse errors are NOT retryable — the LLM returned bad output,
        // retrying the same prompt will likely produce the same result.
        throw new Error(
          `Failed to parse Claude response as JSON: ${parseError instanceof Error ? parseError.message : String(parseError)}`,
        );
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry parse errors (LLM output won't change on retry)
      if (lastError.message.includes("Failed to parse")) {
        throw lastError;
      }

      // Retry transient failures with exponential backoff
      if (attempt < MAX_RETRIES && isRetryable(error)) {
        const backoffMs = RETRY_BASE_MS * Math.pow(2, attempt);
        console.warn(
          `[claude-client] ${model} attempt ${attempt + 1} failed (${lastError.message}), retrying in ${backoffMs}ms`,
        );
        await sleep(backoffMs);
        continue;
      }

      // Non-retryable or exhausted retries
      throw lastError;
    }
  }

  // Should be unreachable, but TypeScript needs it
  throw lastError ?? new Error("[claude-client] Unknown error");
}
