import { ClientOptions, OpenAI } from 'openai'
import { useEffect, useState } from 'react'

const config: ClientOptions = {
    apiKey: '',
    baseURL: 'https://api.openai.com/v1',
    dangerouslyAllowBrowser: true,
}

export const openAI = new OpenAI(config)

export interface OpenAICompletionSettings {
    model: string
    temperature: number | string
}
export const BASE_OPENAI_SETTINGS: OpenAICompletionSettings = {
    model: 'gpt-3.5-turbo',
    temperature: 0.3,
}

export const getAiModelList = async (aiAPIKey: string) => {
    openAI.apiKey = aiAPIKey
    return openAI.models.list().then((m) => m.getPaginatedItems())
}

export const useAiModelList = (apiKey: string) => {
    const [models, setModels] = useState<OpenAI.Model[]>([])
    useEffect(() => {
        getAiModelList(apiKey).then(setModels)
    }, [apiKey])
    return models
}
