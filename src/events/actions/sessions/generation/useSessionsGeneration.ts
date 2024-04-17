import { Event, Session } from '../../../../types'
import { useCallback, useState } from 'react'
import pLimit from 'p-limit'
import {
    GenerateSessionsTeasingContentPrompts,
    generateSessionTeasingContent,
    TeasingPostSocials,
} from './generateSessionTeasingContent'
import { updateSessions } from '../updateSession'
import { generateApiKey } from '../../../../utils/generateApiKey'
import { updateEvent } from '../../updateEvent'
import { generateShortVid } from './generateShortVid'

export enum GenerationStates {
    IDLE = 'IDLE',
    GENERATING = 'GENERATING',
    SUCCESS = 'SUCCESS',
    ERROR = 'ERROR',
}

type TeasingPostSocialsKeyOf = keyof typeof TeasingPostSocials
type StateInterface = {
    generationState: GenerationStates
    videoStates: GenerationStates
    progress: string
    videoProgress: string
    message: string
    results: {
        social: TeasingPostSocials
        session: Session
        result: string | null
        videoUrl?: string
    }[]
}

type ShortVidSettings = {
    backgroundColor: string
    title: string
    startingDate: string
    logoUrl: string
    location: string | null
    speaker: {
        pictureUrl: string
        name: string
        company: string
        job: string | null
    }
}

const PARALLEL_REQUEST = 2

const limitRunner = pLimit(PARALLEL_REQUEST)

export const useSessionsGeneration = (event: Event) => {
    const [state, setState] = useState<StateInterface>({
        generationState: GenerationStates.IDLE,
        videoStates: GenerationStates.IDLE,
        progress: '',
        videoProgress: '',
        message: '',
        results: [],
    })

    const generateMediaContent = useCallback(
        async (
            sessions: Session[],
            updateDoc = false,
            promptSystem = GenerateSessionsTeasingContentPrompts.fr.system,
            promptUser = GenerateSessionsTeasingContentPrompts.fr.user
        ) => {
            const sessionsCount = sessions.length

            setState({
                ...state,
                generationState: GenerationStates.GENERATING,
                progress: `0/${sessionsCount}`,
            })

            if (!event.openAPIKey || !sessionsCount) {
                setState({
                    ...state,
                    generationState: GenerationStates.ERROR,
                    progress: `0/${sessionsCount}`,
                    message: 'No sessions to generate or no openAPIKey',
                })
                return
            }

            const input = sessions.flatMap((session) => {
                return (Object.keys(TeasingPostSocials) as Array<TeasingPostSocialsKeyOf>).map((socialKey) => {
                    return limitRunner(
                        async () =>
                            await generateSessionTeasingContent(
                                event.openAPIKey!!,
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
                setState((oldState) => ({
                    ...oldState,
                    progress: `${tasksDone}/${taskCount}`,
                }))
            }, 1000)

            const results = await Promise.all(input)

            clearInterval(interval)

            if (updateDoc) {
                const newSessions = sessions
                    .map(
                        (session) =>
                            ({
                                id: session.id,
                                teasingPosts: {},
                            } as Partial<Session>)
                    )
                    .map((session) => {
                        results.forEach((result) => {
                            if (result.session.id === session.id) {
                                if (!session.teasingPosts) {
                                    session.teasingPosts = {}
                                }
                                session.teasingPosts[result.social] = result.result
                            }
                        })
                        return session as Session
                    })
                await updateSessions(event.id, newSessions)
            }

            setState({
                ...state,
                generationState: GenerationStates.SUCCESS,
                progress: `${taskCount}/${taskCount}`,
                message: '',
                results: results,
            })
        },
        []
    )

    const generateVideos = useCallback(
        async (sessions: Session[], updateDoc: boolean, shortVidSettings: ShortVidSettings) => {
            const sessionsCount = sessions.length

            setState({
                ...state,
                videoStates: GenerationStates.GENERATING,
                videoProgress: `0/${sessionsCount}`,
            })

            let apiKey = event.apiKey
            if (!event.apiKey) {
                apiKey = generateApiKey()
                await updateEvent(event.id, { apiKey })
            }

            if (!sessionsCount) {
                setState({
                    ...state,
                    videoStates: GenerationStates.ERROR,
                    videoProgress: `0/${sessionsCount}`,
                    message: 'No sessions to generate videos',
                })
                return
            }

            const videoSessionMapping: { [key: string]: string } = {}

            for (const session of sessions) {
                // TODO : add UI for settings

                const { success, error, shortVidUrl } = await generateShortVid(
                    event.id,
                    session.id,
                    apiKey as string,
                    'TalkBranded',
                    updateDoc,
                    shortVidSettings
                )

                if (!success) {
                    setState({
                        ...state,
                        videoStates: GenerationStates.ERROR,
                        videoProgress: `${state.results.length}/${sessionsCount}`,
                        message: error,
                    })
                    return
                }

                videoSessionMapping[session.id] = shortVidUrl

                setState((oldState) => ({
                    ...oldState,
                    videoProgress: `${oldState.results.length + 1}/${sessionsCount}`,
                    results: [
                        ...(oldState.results || []),
                        {
                            social: TeasingPostSocials.Twitter,
                            session: session,
                            result: null,
                            videoUrl: shortVidUrl,
                        },
                    ],
                }))
            }

            if (updateDoc) {
                const newSessions = sessions.map((session) => {
                    return {
                        ...session,
                        shortVidUrl: videoSessionMapping[session.id],
                    }
                })
                await updateSessions(event.id, newSessions)
            }

            setState((oldState) => ({
                ...oldState,
                videoStates: GenerationStates.SUCCESS,
                videoProgress: `${oldState.results.length}/${sessionsCount}`,
                message: '',
            }))
        },
        []
    )

    return { generatingState: state, generateMediaContent, generateVideos }
}
