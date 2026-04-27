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

export const getAiModelList = async (apiKey: string) => {
    openRouter.apiKey = apiKey
    return openRouter.models.list().then((m) => m.getPaginatedItems())
}

export const useAiModelList = (apiKey: string) => {
    const [models, setModels] = useState<OpenAI.Model[]>([])
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
