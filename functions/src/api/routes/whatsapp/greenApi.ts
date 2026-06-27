// Thin GreenAPI (WhatsApp) client. Each instance also has its own host, but the shared gateway
// routes by instance id, so no per-event URL is needed.
const GREEN_API_BASE = 'https://api.green-api.com'

export type GreenApiCreds = {
    instanceId: string
    token: string
}

const call = async (creds: GreenApiCreds, method: string, payload: unknown): Promise<any> => {
    const url = `${GREEN_API_BASE}/waInstance${creds.instanceId}/${method}/${creds.token}`
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    })
    const text = await res.text()
    if (!res.ok) {
        throw new Error(`GreenAPI ${method} failed (${res.status}): ${text}`)
    }
    return text ? JSON.parse(text) : {}
}

// A WhatsApp chatId for a person is the phone number (digits only, country code included) + "@c.us".
// A value that already looks like a chatId (contains "@") is passed through untouched.
export const toChatId = (raw: string): string => {
    if (raw.includes('@')) return raw
    return `${raw.replace(/[^0-9]/g, '')}@c.us`
}

export const sendMessage = async (creds: GreenApiCreds, chatId: string, message: string): Promise<string> => {
    const data = await call(creds, 'sendMessage', { chatId, message })
    return data.idMessage
}

// https://green-api.com/en/docs/api/sending/SendPoll/ — WhatsApp polls allow up to 12 options.
// Unlike interactive buttons, poll votes DO produce incoming (pollUpdateMessage) webhooks.
export const sendPoll = async (
    creds: GreenApiCreds,
    chatId: string,
    question: string,
    options: string[],
    multipleAnswers = true
): Promise<string> => {
    const data = await call(creds, 'sendPoll', {
        chatId,
        message: question,
        options: options.slice(0, 12).map((name) => ({ optionName: name })),
        multipleAnswers,
    })
    return data.idMessage
}

// Configure the instance to call our webhook for incoming messages (poll votes included). GreenAPI
// sends webhookUrlToken back as the "Authorization: Bearer <token>" header. NB: changing settings
// reboots the instance (it can be unavailable for a few minutes afterwards).
export const setSettings = async (
    creds: GreenApiCreds,
    settings: { webhookUrl: string; webhookUrlToken: string }
): Promise<void> => {
    await call(creds, 'setSettings', {
        webhookUrl: settings.webhookUrl,
        webhookUrlToken: settings.webhookUrlToken,
        incomingWebhook: 'yes',
        pollMessageWebhook: 'yes',
    })
}
