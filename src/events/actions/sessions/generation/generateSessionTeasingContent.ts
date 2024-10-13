import { EventAISettings, Session } from '../../../../types'
import { BASE_OPENAI_SETTINGS, openAI, OpenAICompletionSettings } from '../../../../services/openai'
import { isNumber } from '@mui/x-data-grid/internals'

export enum TeasingPostSocials {
    Twitter = 'twitter',
    LinkedIn = 'linkedin',
    Facebook = 'facebook',
    Instagram = 'instagram',
}

export const GenerateSessionsTeasingContentPrompts = {
    fr: {
        system: "Tu organises une conférence et tu écris des posts sur XSOCIALX dans lequels tu veux annoncer une session, teaser son contenu et son présentateur de manière brève et qui donne envie d'en savoir plus.",
        user: `Génère moi un post pour annoncer la session suivante :
Titre : XTITLEX
Résumé : XABSTRACTX
Catégorie : XCATEGORYX
Niveau : XLEVELX
Présentateur(s) : XPRESENTERX
Tags : XTAGSX
Format : XFORMATX`,
    },
    en: {
        system: 'You are organizing a conference and you are writing posts on XSOCIALX in which you want to announce a session, tease its content and its presenter in a brief way that makes you want to know more.',
        user: `Generate a post to announce the following session:
Title: XTITLEX
Abstract: XABSTRACTX
Category: XCATEGORYX
Level: XLEVELX
Presenter(s): XPRESENTERX
Tags: XTAGSX
Format: XFORMATX`,
    },
}

export const BaseAiSettings: EventAISettings = {
    model: BASE_OPENAI_SETTINGS.model,
    temperature: `${BASE_OPENAI_SETTINGS.temperature}`,
    sessions: {
        teasingPromptSystem: GenerateSessionsTeasingContentPrompts.fr.system,
        teasingPromptUser: GenerateSessionsTeasingContentPrompts.fr.user,
    },
}

export const generateSessionTeasingContent = async (
    apiKey: string,
    social: TeasingPostSocials,
    session: Session,
    promptSystem: string,
    promptUser: string,
    generationSettings: OpenAICompletionSettings = BASE_OPENAI_SETTINGS
) => {
    const systemPromptHydrated = promptSystem.replace('XSOCIALX', social)
    const userPromptHydrated = promptUser
        .replace('XTITLEX', session.title)
        .replace('XABSTRACTX', session.abstract || '')
        .replace('XCATEGORYX', session.category || '')
        .replace('XLEVELX', session.level || '')
        .replace('XPRESENTERX', (session.speakersData || []).map((s) => s.name).join(', '))
        .replace('XTAGSX', (session.tags || []).join(', '))
        .replace('XFORMATX', session.format || '')

    openAI.apiKey = apiKey
    return openAI.chat.completions
        .create({
            messages: [
                {
                    role: 'system',
                    content: systemPromptHydrated,
                },
                {
                    role: 'user',
                    content: userPromptHydrated,
                },
            ],
            model: generationSettings.model,
            temperature: isNumber(generationSettings.temperature)
                ? generationSettings.temperature
                : parseFloat(generationSettings.temperature as string),
        })
        .then((result) => result.choices[0].message.content)
}
