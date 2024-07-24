import { Event, Session, Speaker } from '../../../types'
import { baseStorageUrl } from '../../../services/firebase'
import { uploadImage } from '../../../utils/images/uploadImage'
import { updateSpeaker } from './updateSpeaker'
import { useCallback, useEffect, useState } from 'react'

export const useMoveAllImagesToOpenPlannerStorage = (event: Event, sessions: Session[]) => {
    const [state, setState] = useState<{
        shouldUpdateImageStorage: boolean
        isLoading: boolean
        error: string[]
        isError: boolean
        progress: number
        total: number
        isTotalCalculated: boolean
    }>({
        shouldUpdateImageStorage: false,
        isLoading: false,
        error: [],
        isError: false,
        progress: 0,
        total: 0,
        isTotalCalculated: false,
    })

    useEffect(() => {
        if (!state.isTotalCalculated && sessions.length > 0) {
            const total = getTotalImagesToChange(sessions)
            setState((newState) => ({
                ...newState,
                total: total,
                shouldUpdateImageStorage: total > 0,
                isTotalCalculated: true,
            }))
        }
    }, [sessions])

    const moveAllImagesToOpenPlannerStorage = useCallback(async () => {
        setState((newState) => ({
            ...newState,
            isLoading: true,
            error: [],
            isError: false,
            progress: 0,
        }))
        const errors: string[] = []
        for (const session of sessions) {
            if (session.speakersData?.length) {
                for (const speaker of session.speakersData) {
                    let i = 0
                    const shouldUpdatePhotoUrl = speaker.photoUrl && !speaker.photoUrl.startsWith(baseStorageUrl)
                    const shouldUpdateCompanyLogoUrl =
                        speaker.companyLogoUrl && !speaker.companyLogoUrl.startsWith(baseStorageUrl)

                    if (shouldUpdatePhotoUrl) {
                        const result = await downloadAndUpdateSpeakerImage(event, speaker, 'photoUrl')
                        if (result.success) {
                            i++
                        } else {
                            errors.push(result.error)
                        }
                    }

                    if (shouldUpdateCompanyLogoUrl) {
                        const result = await downloadAndUpdateSpeakerImage(event, speaker, 'companyLogoUrl')
                        if (result.success) {
                            i++
                        } else {
                            errors.push(result.error)
                        }
                    }

                    setState((newState) => ({
                        ...newState,
                        progress: newState.progress + i,
                        error: errors,
                        isError: errors.length > 0,
                    }))
                }
            }
        }

        setState((newState) => ({
            ...newState,
            isLoading: false,
        }))
    }, [sessions])

    return {
        ...state,
        moveAllImagesToOpenPlannerStorage,
    }
}

const getTotalImagesToChange = (sessions: Session[]) => {
    return sessions.reduce((acc, session) => {
        if (session.speakersData?.length) {
            return session.speakersData.reduce((acc, speaker) => {
                const shouldUpdatePhotoUrl = speaker.photoUrl && !speaker.photoUrl.startsWith(baseStorageUrl)
                const shouldUpdateCompanyLogoUrl =
                    speaker.companyLogoUrl && !speaker.companyLogoUrl.startsWith(baseStorageUrl)

                if (shouldUpdatePhotoUrl && !shouldUpdateCompanyLogoUrl) {
                    return acc + 1
                }
                if (shouldUpdateCompanyLogoUrl && !shouldUpdatePhotoUrl) {
                    return acc + 1
                }
                if (shouldUpdatePhotoUrl && shouldUpdateCompanyLogoUrl) {
                    return acc + 2
                }
                return acc
            }, acc)
        }

        return acc
    }, 0)
}

const downloadAndUpdateSpeakerImage = async (
    event: Event,
    speaker: Speaker,
    fieldName: 'photoUrl' | 'companyLogoUrl'
): Promise<
    | {
          success: true
          error: null
      }
    | {
          success: false
          error: string
      }
> => {
    try {
        const imageToDownload = speaker[fieldName]
        if (!imageToDownload) {
            return {
                success: true,
                error: null,
            }
        }
        const imageFetchResult = await fetch(imageToDownload)
        if (!imageFetchResult.ok) {
            console.warn(
                'Error downloading image',
                imageFetchResult.statusText,
                imageFetchResult.status,
                imageToDownload
            )
            return {
                success: false,
                error: `Error downloading image for speaker ${speaker.name}, error: ${imageFetchResult.statusText} (${imageFetchResult.status})`,
            }
        }

        const imageBlob = await imageFetchResult.blob()
        const newImageUrl = await uploadImage(event, imageBlob)

        await updateSpeaker(event.id, {
            id: speaker.id,
            [fieldName]: newImageUrl,
        })

        return {
            success: true,
            error: null,
        }
    } catch (error) {
        console.error('error downloading or uploading image', error)
        return {
            success: false,
            error: `Error downloading or uploading image for speaker ${speaker.name}, error: ${error}`,
        }
    }
}
