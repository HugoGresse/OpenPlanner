import { Event, Session } from '../../../../types'
import { useCallback, useState } from 'react'
import { updateSessions } from '../updateSession'
import { useConfirmBrowserClose } from '../../../../hooks/useConfirmBrowserClose'

export enum GenerationStates {
    IDLE = 'IDLE',
    GENERATING = 'GENERATING',
    SUCCESS = 'SUCCESS',
    ERROR = 'ERROR',
}

export type GenerateBaseResult = {
    baseSession: Session
    updatedSession: Partial<Session>
}

export type GenerateBaseResultAnswer = {
    results: GenerateBaseResult[]
    success: boolean
    message?: string
}

export type GenerateBaseSettings = {}

export const useSessionsGenerationGeneric = <
    GenerateSettings extends GenerateBaseSettings,
    AnswerType extends GenerateBaseResultAnswer
>(
    event: Event,
    generateFunction: (
        sessions: Session[],
        settings: GenerateSettings,
        progressCallback: (totalCount: number, doneCount: number) => void
    ) => Promise<AnswerType>
) => {
    const [state, setState] = useState<{
        generationState: GenerationStates
        progress: string
        message: string
        results: AnswerType | null
    }>({
        generationState: GenerationStates.IDLE,
        progress: '',
        message: '',
        results: null,
    })

    useConfirmBrowserClose(state.generationState === GenerationStates.GENERATING, 'Generation in progress')

    const generate = useCallback(
        async (
            sessions: Session[],
            updateDoc = false,
            settings: GenerateSettings
        ): Promise<{
            success: boolean
            results: any[]
            message?: string
        }> => {
            const sessionsCount = sessions.length

            setState({
                ...state,
                generationState: GenerationStates.GENERATING,
                progress: `0/${sessionsCount}`,
            })

            const answer: AnswerType = await generateFunction(sessions, settings, (totalCount, doneCount) => {
                setState((newState) => ({
                    ...newState,
                    progress: `${doneCount}/${totalCount}`,
                }))
            })

            if (!answer.success) {
                setState({
                    ...state,
                    generationState: GenerationStates.ERROR,
                    progress: `${answer.results.length}/${sessionsCount}`,
                    message: answer.message || 'Error',
                })
                return {
                    success: false,
                    results: [],
                    message:
                        answer.message ||
                        'Unknown error while generating the video/image, you may want to switch the ShortVid server',
                }
            }

            if (updateDoc) {
                const newSessions = sessions.map((session) => {
                    const result = answer.results.find((r) => r.baseSession.id === session.id)
                    if (!result) {
                        return session
                    }
                    return {
                        id: session.id,
                        ...result.updatedSession,
                    }
                })
                await updateSessions(event.id, newSessions)
            }

            setState({
                ...state,
                generationState: GenerationStates.SUCCESS,
                progress: ``,
                message: '',
                results: answer,
            })
            return answer
        },
        []
    )

    return { generatingState: state, generate }
}
