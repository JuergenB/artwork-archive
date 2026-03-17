// AI Agent Registry
// Add agents here as you build them out.
// Each agent defines its model, provider, and API method.
//
// apiMethod:
//   "ai-sdk"  — Vercel AI SDK (streaming, for chat interfaces)
//   "direct"  — Direct API call (batch processing, non-streaming)

export type AgentConfig = {
  model: string
  provider: "anthropic" | "openai" | "perplexity"
  apiMethod: "ai-sdk" | "direct"
  description?: string
}

export const agents: Record<string, AgentConfig> = {
  // Example:
  // "my-agent": {
  //   model: "claude-sonnet-4-6",
  //   provider: "anthropic",
  //   apiMethod: "ai-sdk",
  //   description: "What this agent does",
  // },
}

export function getAgent(name: string): AgentConfig {
  const agent = agents[name]
  if (!agent) {
    throw new Error(`Agent "${name}" is not registered in lib/ai/config.ts`)
  }
  return agent
}
