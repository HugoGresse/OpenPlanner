import { ToolDefinition } from './toolKit'

export type OpenRouterToolCall = { id: string; type: 'function'; function: { name: string; arguments: string } }

export type OpenRouterMessage = {
    role: string
    content: string | null
    tool_calls?: OpenRouterToolCall[]
    tool_call_id?: string
    name?: string
}

const EPHEMERAL = { type: 'ephemeral' } as const

// Providers that honour Anthropic-style cache_control breakpoints through OpenRouter. Other providers cache
// on their own (OpenAI, Gemini 2.5+, DeepSeek, Grok), so their request stays untouched.
export const supportsCacheBreakpoints = (model: string): boolean => /^~?anthropic\//.test(model)

type OpenRouterBody = {
    model: string
    stream: true
    // Asks for token counts in the stream: the only way to see whether the cache is hit.
    usage: { include: true }
    messages: unknown[]
    tools: ToolDefinition[]
    cache_control?: typeof EPHEMERAL
}

// The tools and the system prompt are the same bytes on every round and every conversation of an event, and
// Anthropic renders them first (tools, system, messages). A breakpoint on the system message caches that whole
// prefix; the top-level cache_control lets the provider also cache the conversation as it grows, so each tool
// round only pays full price for what the previous round appended.
// `cache` is false for providers without breakpoints, and after the provider rejected a marked request.
export const buildOpenRouterBody = (
    model: string,
    conversation: OpenRouterMessage[],
    tools: ToolDefinition[],
    cache: boolean = supportsCacheBreakpoints(model)
): OpenRouterBody => {
    const base = { model, stream: true as const, usage: { include: true as const } }
    const [system, ...rest] = conversation
    if (!cache || system?.role !== 'system' || typeof system.content !== 'string') {
        return { ...base, messages: conversation, tools }
    }
    const cachedSystem = {
        role: 'system',
        content: [{ type: 'text', text: system.content, cache_control: EPHEMERAL }],
    }
    return { ...base, messages: [cachedSystem, ...rest], tools, cache_control: EPHEMERAL }
}

export type PromptUsage = { promptTokens: number; cachedTokens: number; cacheWriteTokens: number }

type RawUsage = {
    prompt_tokens?: number
    prompt_tokens_details?: { cached_tokens?: number; cache_write_tokens?: number } | null
}

export const toPromptUsage = (usage: unknown): PromptUsage | null => {
    if (!usage || typeof usage !== 'object') return null
    const { prompt_tokens, prompt_tokens_details } = usage as RawUsage
    if (typeof prompt_tokens !== 'number') return null
    return {
        promptTokens: prompt_tokens,
        cachedTokens: prompt_tokens_details?.cached_tokens ?? 0,
        cacheWriteTokens: prompt_tokens_details?.cache_write_tokens ?? 0,
    }
}
