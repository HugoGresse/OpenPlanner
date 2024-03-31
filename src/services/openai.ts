import { ClientOptions, OpenAI } from 'openai'

const config: ClientOptions = {
    apiKey: '',
    baseURL: 'https://api.openai.com/v1',
    dangerouslyAllowBrowser: true,
}

export const openAI = new OpenAI(config)

export interface OpenAICompletionSettings {
    model: string
    temperature: number
}
export const BASE_OPENAI_SETTINGS: OpenAICompletionSettings = {
    model: 'gpt-3.5-turbo',
    temperature: 0.3,
}
