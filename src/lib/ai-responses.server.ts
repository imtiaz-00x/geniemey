import { createOpenAI } from "@ai-sdk/openai";
import { streamText, type ModelMessage } from "ai";
import { getLovableApiKey } from "./ai-gateway.server";
import { createLovableAiGatewayRunIdFetch } from "./run-id";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1";

/** Default chat/text model for new server-side AI calls. */
export const DEFAULT_TEXT_MODEL = "openai/gpt-6-astra";

/**
 * One streaming Responses call through the Lovable AI Gateway.
 * Create per server request; consume `await result.text` for final text.
 */
export function createAppResponsesCall(
  messages: ModelMessage[],
  options: {
    instructions?: string;
    reasoningEffort?: "low" | "medium" | "high";
  } = {},
) {
  const apiKey = getLovableApiKey();
  const runIdFetch = createLovableAiGatewayRunIdFetch();
  const provider = createOpenAI({
    baseURL: GATEWAY_URL,
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    fetch: runIdFetch.fetch,
  });
  return streamText({
    model: provider.responses(DEFAULT_TEXT_MODEL),
    ...(options.instructions ? { instructions: options.instructions } : {}),
    messages,
    providerOptions: {
      openai: {
        store: false,
        forceReasoning: true,
        reasoningEffort: options.reasoningEffort ?? "low",
        reasoningSummary: "auto",
        include: ["reasoning.encrypted_content"],
      },
    },
  });
}
