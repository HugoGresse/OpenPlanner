import { Session } from '../../../../types'
import pLimit from 'p-limit'
import { generateSessionTeasingContent, TeasingPostSocials } from './generateSessionTeasingContent'
import { GenerateBaseResultAnswer, GenerateBaseSettings } from './useSessionsGenerationGeneric'

type TeasingPostSocialsKeyOf = keyof typeof TeasingPostSocials

const PARALLEL_REQUEST = 4

const limitRunner = pLimit(PARALLEL_REQUEST)

export type GenerateSessionTeasingTextsSettings = {
    prompts: {
        [lang: string]: {
            system: string
            user: string
        }
    }
    openApiKey: string | null
} & GenerateBaseSettings

export type GeneratedSessionTeasingTextAnswer = {
    success: boolean
    results: {
        baseSession: Session
        updatedSession: Partial<Session>
        social: string
    }[]
} & GenerateBaseResultAnswer

export const generateSessionTeasingTexts = async (
    sessions: Session[],
    settings: GenerateSessionTeasingTextsSettings,
    progressCallback: (totalCount: number, doneCount: number) => void
): Promise<GeneratedSessionTeasingTextAnswer> => {
    const promptSystem = settings.prompts.fr.system
    const promptUser = settings.prompts.fr.user

    const sessionsCount = sessions.length

    if (!settings.openApiKey || !sessionsCount) {
        return {
            success: false,
            message: 'No sessions to generate or no openAPIKey',
            results: [],
        }
    }

    const input = sessions.flatMap((session) => {
        return (Object.keys(TeasingPostSocials) as Array<TeasingPostSocialsKeyOf>).map((socialKey) => {
            return limitRunner(
                async () =>
                    await generateSessionTeasingContent(
                        settings.openApiKey!!,
                        TeasingPostSocials[socialKey],
                        session,
                        promptSystem,
                        promptUser
                    )
            ).then((result) => ({
                social: TeasingPostSocials[socialKey],
                session: session,
                result,
            }))
        })
    })

    const taskCount = input.length

    const interval = setInterval(() => {
        const tasksDone = taskCount - limitRunner.pendingCount - limitRunner.activeCount
        progressCallback(taskCount, tasksDone)
    }, 1000)

    const results = await Promise.all(input)

    clearInterval(interval)

    return {
        success: true,
        results: sessions
            .map((session) => ({
                baseSession: session,
                updatedSession: {
                    id: session.id,
                    teasingPosts: {
                        ...session.teasingPosts,
                    },
                },
                social: '',
            }))
            .map((sessionObject) => {
                results.forEach((result) => {
                    if (result.session.id === sessionObject.baseSession.id) {
                        if (!sessionObject.updatedSession.teasingPosts) {
                            sessionObject.updatedSession.teasingPosts = {}
                        }
                        sessionObject.updatedSession.teasingPosts[result.social] = result.result
                        sessionObject.social = result.result || ''
                    }
                })
                return sessionObject
            }),
    }
}
