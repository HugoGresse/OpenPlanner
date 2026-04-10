import { useCallback, useEffect, useState } from 'react'
import { Event, Speaker } from '../../../types'
import { getImageInfo, ImageInfo } from '../../../utils/images/getImageInfo'
import { updateSpeaker } from './updateSpeaker'
import { useEventFiles } from '../../../services/hooks/useEventFiles'
import { uploadImage } from '../../../utils/images/uploadImage'
import { resizeImage } from '../../../utils/images/resizeImage'

export interface SpeakerAvatarInfo {
    speaker: Speaker
    imageInfo: ImageInfo | null
    isLoading: boolean
    error: string | null
}

export interface ResizeProgress {
    isLoading: boolean
    progress: number
    total: number
    errors: string[]
}

export const useResizeSpeakerAvatars = (event: Event, speakers: Speaker[]) => {
    const [avatarInfos, setAvatarInfos] = useState<SpeakerAvatarInfo[]>([])
    const [resizeProgress, setResizeProgress] = useState<ResizeProgress>({
        isLoading: false,
        progress: 0,
        total: 0,
        errors: [],
    })

    const { filesPath, isLoading: isFilesLoading } = useEventFiles(event)

    // Load image info for each speaker avatar
    useEffect(() => {
        const speakersWithPhotos = speakers.filter((s) => s.photoUrl)

        setAvatarInfos(
            speakers.map((speaker) => ({
                speaker,
                imageInfo: null,
                isLoading: Boolean(speaker.photoUrl),
                error: null,
            }))
        )

        speakersWithPhotos.forEach((speaker) => {
            if (!speaker.photoUrl) return

            getImageInfo(speaker.photoUrl)
                .then((info) => {
                    setAvatarInfos((prev) =>
                        prev.map((item) =>
                            item.speaker.id === speaker.id
                                ? { ...item, imageInfo: info, isLoading: false }
                                : item
                        )
                    )
                })
                .catch(() => {
                    setAvatarInfos((prev) =>
                        prev.map((item) =>
                            item.speaker.id === speaker.id
                                ? { ...item, imageInfo: null, isLoading: false, error: 'Failed to load image info' }
                                : item
                        )
                    )
                })
        })
    }, [speakers])

    const resizeAllAvatars = useCallback(
        async (maxSize: number) => {
            if (isFilesLoading) return

            const speakersToResize = speakers.filter((s) => {
                if (!s.photoUrl) return false
                const info = avatarInfos.find((item) => item.speaker.id === s.id)?.imageInfo
                return info && Math.max(info.width, info.height) > maxSize
            })

            setResizeProgress({
                isLoading: true,
                progress: 0,
                total: speakersToResize.length,
                errors: [],
            })

            const errors: string[] = []

            for (const speaker of speakersToResize) {
                if (!speaker.photoUrl) continue

                try {
                    const response = await fetch(speaker.photoUrl)
                    if (!response.ok) {
                        throw new Error(`HTTP error ${response.status}`)
                    }
                    const blob = await response.blob()
                    const file = new File([blob], 'avatar', { type: blob.type })
                    const resizedBlob = await resizeImage(file, maxSize)

                    const newUrl = await uploadImage(filesPath.imageFolder, resizedBlob)
                    await updateSpeaker(event.id, { id: speaker.id, photoUrl: newUrl })

                    // Update local avatar info
                    setAvatarInfos((prev) =>
                        prev.map((item) =>
                            item.speaker.id === speaker.id
                                ? {
                                      ...item,
                                      speaker: { ...item.speaker, photoUrl: newUrl },
                                      imageInfo: null,
                                      isLoading: true,
                                  }
                                : item
                        )
                    )

                    // Refresh image info for resized image
                    getImageInfo(newUrl)
                        .then((info) => {
                            setAvatarInfos((prev) =>
                                prev.map((item) =>
                                    item.speaker.id === speaker.id
                                        ? { ...item, imageInfo: info, isLoading: false }
                                        : item
                                )
                            )
                        })
                        .catch(() => {
                            setAvatarInfos((prev) =>
                                prev.map((item) =>
                                    item.speaker.id === speaker.id
                                        ? { ...item, isLoading: false }
                                        : item
                                )
                            )
                        })
                } catch (err) {
                    errors.push(`Failed to resize avatar for ${speaker.name}: ${err}`)
                }

                setResizeProgress((prev) => ({
                    ...prev,
                    progress: prev.progress + 1,
                    errors,
                }))
            }

            setResizeProgress((prev) => ({
                ...prev,
                isLoading: false,
                errors,
            }))
        },
        [event.id, speakers, avatarInfos, filesPath, isFilesLoading]
    )

    return {
        avatarInfos,
        resizeProgress,
        resizeAllAvatars,
        isFilesLoading,
    }
}
