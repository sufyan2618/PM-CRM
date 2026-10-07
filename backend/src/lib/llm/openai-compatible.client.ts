import { env } from "../../config/env";
import { logger } from "../logger";
import { HttpError } from "../../utils/errors";
import type { LlmClient } from "./llm.types";

export class OpenAiCompatibleClient implements LlmClient {
  constructor(
    private readonly options: {
      baseUrl?: string;
      apiKey?: string;
      model?: string;
      timeoutMs?: number;
      temperature?: number;
    } = {},
  ) {}

  async completeJson(input: { system: string; user: string }): Promise<string> {
    const baseUrl = (this.options.baseUrl ?? env.LLM_BASE_URL).replace(/\/$/, "");
    const apiKey = this.options.apiKey ?? env.LLM_API_KEY;
    const model = this.options.model ?? env.LLM_MODEL;
    const timeoutMs = this.options.timeoutMs ?? env.LLM_TIMEOUT_MS;
    const temperature = this.options.temperature ?? env.LLM_TEMPERATURE;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          temperature,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: input.system },
            { role: "user", content: input.user },
          ],
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorBody = await response.text().catch(() => "");
        let providerMessage = "";
        try {
          const parsed = JSON.parse(errorBody) as { error?: { message?: string; code?: string } };
          providerMessage = parsed.error?.message ?? "";
        } catch {
          providerMessage = errorBody.slice(0, 300);
        }

        logger.error("LLM provider error", {
          status: response.status,
          model,
          providerMessage: providerMessage.slice(0, 500),
        });

        throw new HttpError(
          502,
          providerMessage
            ? `AI provider request failed: ${providerMessage}`
            : "AI provider request failed. Please try again.",
          "AI_FAILURE",
          { status: response.status, model },
        );
      }

      const data = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const content = data.choices?.[0]?.message?.content;
      if (!content || typeof content !== "string") {
        throw new HttpError(502, "AI returned an empty response", "AI_FAILURE");
      }
      return content;
    } catch (error) {
      if (error instanceof HttpError) throw error;
      if (error instanceof Error && error.name === "AbortError") {
        throw new HttpError(502, "AI request timed out. Please try again.", "AI_FAILURE");
      }
      throw new HttpError(502, "AI provider request failed. Please try again.", "AI_FAILURE");
    } finally {
      clearTimeout(timer);
    }
  }
}
