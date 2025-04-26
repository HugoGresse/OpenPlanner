import { Event, EventFiles, Session, Speaker } from '../../../types'
import { isStorageUrl } from '../../../services/firebase'
import { uploadImage } from '../../../utils/images/uploadImage'
import { updateSpeaker } from './updateSpeaker'
import { useCallback, useEffect, useState } from 'react'
import { useEventFiles } from '../../../services/hooks/useEventFiles'
import { API_URL } from '../../../env'

export const useMoveAllImagesToOpenPlannerStorage = (event: Event, sessions: Session[]) => {
    const [state, setState] = useState<{
        shouldUpdateImageStorage: boolean
        isLoading: boolean
        error: string[]
        isError: boolean
        progress: number
        total: number
        isTotalCalculated: boolean
        isFilesLoading: boolean
        filesError: string | null
    }>({
        shouldUpdateImageStorage: false,
        isLoading: false,
        error: [],
        isError: false,
        progress: 0,
        total: 0,
        isTotalCalculated: false,
        isFilesLoading: false,
        filesError: null,
    })

    const { filesPath, isLoading: isFilesLoading, error: filesError } = useEventFiles(event)

    useEffect(() => {
        setState((prev) => ({
            ...prev,
            isFilesLoading,
            filesError: filesError || null,
        }))
    }, [isFilesLoading, filesError])

    useEffect(() => {
        if (!state.isTotalCalculated && sessions.length > 0 && !state.isFilesLoading && !state.filesError) {
            const total = getTotalImagesToChange(sessions)
            setState((newState) => ({
                ...newState,
                total: total,
                shouldUpdateImageStorage: total > 0,
                isTotalCalculated: true,
            }))
        }
    }, [sessions, state.isFilesLoading, state.filesError])

    const moveAllImagesToOpenPlannerStorage = useCallback(async () => {
        // Don't proceed if files are still loading or there's an error with files
        if (state.isFilesLoading || state.filesError) {
            return
        }

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
                    const shouldUpdatePhotoUrl = speaker.photoUrl && !isStorageUrl(speaker.photoUrl)
                    const shouldUpdateCompanyLogoUrl = speaker.companyLogoUrl && !isStorageUrl(speaker.companyLogoUrl)

                    if (shouldUpdatePhotoUrl) {
                        const result = await downloadAndUpdateSpeakerImage(event, filesPath, speaker, 'photoUrl')
                        if (result.success) {
                            i++
                        } else {
                            errors.push(result.error)
                        }
                    }

                    if (shouldUpdateCompanyLogoUrl) {
                        const result = await downloadAndUpdateSpeakerImage(event, filesPath, speaker, 'companyLogoUrl')
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
                const shouldUpdatePhotoUrl = speaker.photoUrl && !isStorageUrl(speaker.photoUrl)
                const shouldUpdateCompanyLogoUrl = speaker.companyLogoUrl && !isStorageUrl(speaker.companyLogoUrl)

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
    filesPath: EventFiles,
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
    const imageToDownload = speaker[fieldName]
    if (!imageToDownload) {
        return { success: true, error: null }
    }

    let newImageUrl: string | null = null

    // First attempt: Try to download with regular fetch
    try {
        const imageFetchResult = await fetch(imageToDownload)

        if (imageFetchResult.ok) {
            const imageBlob = await imageFetchResult.blob()
            newImageUrl = await uploadImage(filesPath.imageFolder, imageBlob)
        } else {
            console.warn('Regular fetch failed:', imageFetchResult.statusText, imageFetchResult.status, imageToDownload)
        }
    } catch (error) {
        console.warn('Error during regular fetch:', error)
    }

    // Second attempt: Try using the server-side download and reupload if first attempt failed
    if (!newImageUrl && event.apiKey) {
        try {
            const reuploadResult = await downloadAndReuploadFile(event.id, event.apiKey, imageToDownload)

            if (reuploadResult.success) {
                newImageUrl = reuploadResult.publicFileUrl
            } else {
                return {
                    success: false,
                    error: `Failed to download image for ${speaker.name} using fallback method. Error: ${reuploadResult.error}`,
                }
            }
        } catch (error) {
            return {
                success: false,
                error: `Error during server-side download for speaker ${speaker.name}: ${error}`,
            }
        }
    }

    // Update speaker if we successfully got a new image URL through either method
    if (newImageUrl) {
        try {
            await updateSpeaker(event.id, {
                id: speaker.id,
                [fieldName]: newImageUrl,
            })
            return { success: true, error: null }
        } catch (error) {
            return {
                success: false,
                error: `Error updating speaker ${speaker.name} with new image: ${error}`,
            }
        }
    }

    // Both methods failed
    return {
        success: false,
        error: `Failed to download image for ${speaker.name} using all available methods.${
            !event.apiKey ? ' Fallback method not attempted (missing API key).' : ''
        }`,
    }
}

const downloadAndReuploadFile = async (
    eventId: string,
    apiKey: string,
    fileUrl: string
): Promise<
    | {
          success: true
          publicFileUrl: string
      }
    | {
          success: false
          error: string
      }
> => {
    const url = new URL(API_URL as string)
    url.pathname += `v1/${eventId}/files/download-reupload`
    url.searchParams.append('apiKey', apiKey)

    try {
        const response = await fetch(url.href, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                url: fileUrl,
            }),
        })

        if (response.status !== 201) {
            return {
                success: false,
                error: `API returned error: ${response.status} ${response.statusText}`,
            }
        }

        const result = await response.json()
        return {
            success: true,
            publicFileUrl: result.publicFileUrl,
        }
    } catch (error) {
        return {
            success: false,
            error: `Network or parsing error: ${error}`,
        }
    }
}
