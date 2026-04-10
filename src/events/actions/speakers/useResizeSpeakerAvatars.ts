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

/** Pixel dimension cap applied when resizing avatars (keeps quality reasonable for profile pictures) */
const RESIZE_MAX_PX = 500

export const useResizeSpeakerAvatars = (event: Event, speakers: Speaker[]) => {
    const [avatarInfos, setAvatarInfos] = useState<SpeakerAvatarInfo[]>([])
    const [resizeProgress, setResizeProgress] = useState<ResizeProgress>({
        isLoading: false,
        progress: 0,
        total: 0,
        errors: [],
    })

    const { filesPath, isLoading: isFilesLoading } = useEventFiles(event)

    // Load image info (including file size) for each speaker avatar
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
                    // If HEAD didn't return Content-Length, try fetching the blob to get actual size
                    if (info.fileSize === null && speaker.photoUrl) {
                        fetch(speaker.photoUrl)
                            .then((res) => res.blob())
                            .then((blob) => {
                                setAvatarInfos((prev) =>
                                    prev.map((item) =>
                                        item.speaker.id === speaker.id
                                            ? { ...item, imageInfo: { ...info, fileSize: blob.size }, isLoading: false }
                                            : item
                                    )
                                )
                            })
                            .catch(() => {
                                setAvatarInfos((prev) =>
                                    prev.map((item) =>
                                        item.speaker.id === speaker.id
                                            ? { ...item, imageInfo: info, isLoading: false }
                                            : item
                                    )
                                )
                            })
                    } else {
                        setAvatarInfos((prev) =>
                            prev.map((item) =>
                                item.speaker.id === speaker.id
                                    ? { ...item, imageInfo: info, isLoading: false }
                                    : item
                            )
                        )
                    }
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

    /**
     * Resize all speaker avatars whose file size exceeds `maxSizeKB` kilobytes.
     * The actual compression uses image-blob-reduce capped at RESIZE_MAX_PX on the longest side.
     */
    const resizeAllAvatars = useCallback(
        async (maxSizeKB: number) => {
            if (isFilesLoading) return

            const maxSizeBytes = maxSizeKB * 1024

            const speakersToResize = speakers.filter((s) => {
                if (!s.photoUrl) return false
                const info = avatarInfos.find((item) => item.speaker.id === s.id)?.imageInfo
                return info && info.fileSize !== null && info.fileSize > maxSizeBytes
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
                    const resizedBlob = await resizeImage(file, RESIZE_MAX_PX)

                    const newUrl = await uploadImage(filesPath.imageFolder, resizedBlob)
                    await updateSpeaker(event.id, { id: speaker.id, photoUrl: newUrl })

                    // Mark as loading while we fetch fresh info for the new image
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

                    // Refresh image info (including file size) for the resized image
                    getImageInfo(newUrl)
                        .then((info) => {
                            const updateInfo = (resolvedInfo: ImageInfo) => {
                                setAvatarInfos((prev) =>
                                    prev.map((item) =>
                                        item.speaker.id === speaker.id
                                            ? { ...item, imageInfo: resolvedInfo, isLoading: false }
                                            : item
                                    )
                                )
                            }

                            if (info.fileSize === null) {
                                fetch(newUrl)
                                    .then((res) => res.blob())
                                    .then((b) => updateInfo({ ...info, fileSize: b.size }))
                                    .catch(() => updateInfo(info))
                            } else {
                                updateInfo(info)
                            }
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
