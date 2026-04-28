import { ClientOptions, OpenAI } from 'openai'
import { useEffect, useState } from 'react'

const config: ClientOptions = {
    apiKey: '',
    baseURL: 'https://openrouter.ai/api/v1',
    dangerouslyAllowBrowser: true,
    defaultHeaders: {
        'HTTP-Referer': 'https://openplanner.fr',
        'X-Title': 'OpenPlanner',
    },
}

export const openRouter = new OpenAI(config)

export interface OpenRouterCompletionSettings {
    model: string
    temperature: number | string
}

export const BASE_OPENROUTER_SETTINGS: OpenRouterCompletionSettings = {
    model: 'anthropic/claude-sonnet-4',
    temperature: 0.3,
}

// OpenRouter returns richer fields than the OpenAI SDK types describe; the JS
// payload preserves them, so we cast at the boundary.
export interface OpenRouterModel {
    id: string
    name?: string
    created?: number
    pricing?: {
        prompt?: string
        completion?: string
    }
}

export const getAiModelList = async (apiKey: string): Promise<OpenRouterModel[]> => {
    openRouter.apiKey = apiKey
    const items = await openRouter.models.list().then((m) => m.getPaginatedItems())
    return items as unknown as OpenRouterModel[]
}

export const useAiModelList = (apiKey: string): OpenRouterModel[] => {
    const [models, setModels] = useState<OpenRouterModel[]>([])
    useEffect(() => {
        if (!apiKey) {
            setModels([])
            return
        }
        getAiModelList(apiKey)
            .then(setModels)
            .catch(() => setModels([]))
    }, [apiKey])
    return models
}

const stripAlias = (id: string) => (id.startsWith('~') ? id.slice(1) : id)

export const getProviderFromModelId = (id: string): string | null => {
    const stripped = stripAlias(id)
    const slash = stripped.indexOf('/')
    return slash > 0 ? stripped.slice(0, slash) : null
}

// Surface the most relevant ~15 models without hardcoding any provider name:
// 1. group concrete models (skip `~xxx/...-latest` aliases) by their provider
//    prefix (the part before "/" in the id),
// 2. take the 5 providers with the most models (ties broken alphabetically),
// 3. and from each, pick the 3 most recently `created` model ids.
export const getTopModelIds = (models: OpenRouterModel[]): Set<string> => {
    const byProvider = new Map<string, OpenRouterModel[]>()
    for (const m of models) {
        if (!m?.id || m.id.startsWith('~')) continue
        const provider = getProviderFromModelId(m.id)
        if (!provider) continue
        const list = byProvider.get(provider)
        if (list) list.push(m)
        else byProvider.set(provider, [m])
    }
    const topProviders = [...byProvider.entries()]
        .sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]))
        .slice(0, 5)
        .map(([provider]) => provider)
    const result = new Set<string>()
    for (const provider of topProviders) {
        const recent = (byProvider.get(provider) ?? [])
            .slice()
            .sort((a, b) => (b.created ?? 0) - (a.created ?? 0))
            .slice(0, 3)
        for (const m of recent) result.add(m.id)
    }
    return result
}
