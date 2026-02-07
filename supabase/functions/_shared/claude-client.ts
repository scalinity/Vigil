// Claude API Client Helper
// Shared by all agents for calling Claude

import Anthropic from "npm:@anthropic-ai/sdk@0.39.0";

let _client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!_client) {
    _client = new Anthropic({
      apiKey: Deno.env.get("ANTHROPIC_API_KEY")!,
    });
  }
  return _client;
}

/**
 * Calls Claude with a system prompt and user message, expecting JSON output.
 *
 * Used by all agents. Temperature defaults to 0 for deterministic safety-critical
 * decisions. The rewrite agent uses 0.3 to avoid robotic repetition.
 *
 * @param model - "claude-opus-4-6" for review/rewrite, "claude-haiku-4-5-20241022" for triage
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
  const client = getClient();

  const response = await client.messages.create({
    model,
    max_tokens: maxTokens,
    temperature,
    system: systemPrompt,
    messages: [{ role: "user", content: userMessage }],
  });

  // Extract text content
  const textBlock = response.content.find(
    (block: Anthropic.ContentBlock) => block.type === "text",
  );
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text content in Claude response");
  }

  // Parse JSON — agents return raw JSON, no markdown
  // Handle potential markdown code fences wrapping JSON
  let jsonText = (textBlock as Anthropic.TextBlock).text.trim();
  if (jsonText.startsWith("```json")) {
    jsonText = jsonText.slice(7);
  } else if (jsonText.startsWith("```")) {
    jsonText = jsonText.slice(3);
  }
  if (jsonText.endsWith("```")) {
    jsonText = jsonText.slice(0, -3);
  }
  jsonText = jsonText.trim();

  try {
    const parsed = JSON.parse(jsonText);
    return parsed as T;
  } catch (e) {
    throw new Error(
      `Failed to parse Claude response as JSON: ${e instanceof Error ? e.message : String(e)}. ` +
        `Raw response (first 500 chars): ${jsonText.slice(0, 500)}`,
    );
  }
}
