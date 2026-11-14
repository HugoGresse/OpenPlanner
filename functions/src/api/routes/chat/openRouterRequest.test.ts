import { describe, expect, test } from 'vitest'
import { buildOpenRouterBody, supportsCacheBreakpoints, toPromptUsage } from './openRouterRequest'
import { ToolDefinition } from './toolKit'

const tools: ToolDefinition[] = [{ type: 'function', function: { name: 'getEvent', description: '', parameters: {} } }]
const conversation = [
    { role: 'system', content: 'You are an assistant.' },
    { role: 'user', content: 'Hello' },
]

describe('buildOpenRouterBody', () => {
    test('marks the system prompt as a cache breakpoint and enables automatic caching on Anthropic models', () => {
        const body = buildOpenRouterBody('anthropic/claude-sonnet-4', conversation, tools)
        expect(body.messages[0]).toEqual({
            role: 'system',
            content: [{ type: 'text', text: 'You are an assistant.', cache_control: { type: 'ephemeral' } }],
        })
        expect(body.messages[1]).toBe(conversation[1])
        expect(body.cache_control).toEqual({ type: 'ephemeral' })
        expect(body.tools).toBe(tools)
    })

    test('leaves the request untouched for providers that cache on their own', () => {
        const body = buildOpenRouterBody('openai/gpt-5', conversation, tools)
        expect(body).toEqual({
            model: 'openai/gpt-5',
            stream: true,
            usage: { include: true },
            messages: conversation,
            tools,
        })
        expect(JSON.stringify(body)).not.toContain('cache_control')
    })

    test('cache markers can be switched off for an Anthropic model (after a provider rejection)', () => {
        const body = buildOpenRouterBody('anthropic/claude-sonnet-4', conversation, tools, false)
        expect(body.messages).toBe(conversation)
        expect(JSON.stringify(body)).not.toContain('cache_control')
        expect(body.usage).toEqual({ include: true })
    })

    test('serialises the same prefix on every round so the cache keeps hitting', () => {
        const first = JSON.stringify(buildOpenRouterBody('anthropic/claude-sonnet-4', conversation, tools))
        const later = JSON.stringify(
            buildOpenRouterBody(
                'anthropic/claude-sonnet-4',
                [...conversation, { role: 'assistant', content: 'Hi' }, { role: 'user', content: 'More' }],
                tools
            )
        )
        const prefix = first.slice(0, first.indexOf('{"role":"user"'))
        expect(later.startsWith(prefix)).toBe(true)
    })
})

test('supportsCacheBreakpoints covers Anthropic ids and their aliases only', () => {
    expect(supportsCacheBreakpoints('anthropic/claude-sonnet-4')).toBe(true)
    expect(supportsCacheBreakpoints('~anthropic/claude-sonnet-latest')).toBe(true)
    expect(supportsCacheBreakpoints('openrouter/auto')).toBe(false)
    expect(supportsCacheBreakpoints('google/gemini-2.5-pro')).toBe(false)
})

test('toPromptUsage reads the cache counters OpenRouter reports', () => {
    expect(
        toPromptUsage({ prompt_tokens: 9500, prompt_tokens_details: { cached_tokens: 9000, cache_write_tokens: 0 } })
    ).toEqual({ promptTokens: 9500, cachedTokens: 9000, cacheWriteTokens: 0 })
    expect(toPromptUsage({ prompt_tokens: 12 })).toEqual({ promptTokens: 12, cachedTokens: 0, cacheWriteTokens: 0 })
    expect(toPromptUsage(undefined)).toBeNull()
    expect(toPromptUsage({})).toBeNull()
})
