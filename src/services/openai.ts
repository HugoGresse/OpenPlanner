// services/openaiService.ts
import { ClientOptions, OpenAI } from 'openai'
import { Session } from '../types'

const config: ClientOptions = {
    apiKey: '',
    baseURL: 'https://api.openai.com/v1',
    dangerouslyAllowBrowser: true,
}

const openai = new OpenAI(config)

export enum TeasingPostSocials {
    Twitter = 'twitter',
    LinkedIn = 'linkedin',
    Facebook = 'facebook',
    Instagram = 'instagram',
}

export const generatePost = async (apiKey: string, social: TeasingPostSocials, session: Session) => {
    openai.apiKey = apiKey
    return openai.chat.completions.create({
        messages: [
            {
                role: 'system',
                content: `Tu organises une conférence et tu écrist des posts sur ${social}
                dans lequels tu veux annoncer une session, teaser son contenu et son présentateur
                de manière brève et qui donne envie d'en savoir plus.`,
            },
            {
                role: 'user',
                content: `Génère moi un post pour annoncer la session suivante :
                Titre : ${session.title}
                Résumé : ${session.abstract}
                Catégorie : ${session.category}
                Langue : ${session.language}
                Niveau : ${session.level}
                Durée : ${session.durationMinutes} minutes
                Présentateur(s) : ${session.speakers.map((speaker) => ` - ${speaker}`).join('\n')}
                Tags : ${session.tags.join(', ')}
                Format : ${session.format}`,
            },
        ],
        model: 'gpt-3.5-turbo',
    })
}
