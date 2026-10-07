export interface LlmClient {
  completeJson(input: { system: string; user: string }): Promise<string>;
}
