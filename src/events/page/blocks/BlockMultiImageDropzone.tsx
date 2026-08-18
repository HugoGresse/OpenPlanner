import { useCallback, useState } from 'react'
import { Box, CircularProgress, Typography } from '@mui/material'
import { FileUploadRounded } from '@mui/icons-material'
import { useDropzone } from 'react-dropzone'
import { BuildingBlockItem, BuildingBlockVariant, Event } from '../../../types'
import { useEventFiles } from '../../../services/hooks/useEventFiles'
import { useNotification } from '../../../hooks/notificationHook'
import { resizeImage } from '../../../utils/images/resizeImage'
import { uploadImage } from '../../../utils/images/uploadImage'
import { generateFirestoreId } from '../../../utils/generateFirestoreId'
import { slugifyBlockKey } from './blockUtils'

export type BlockMultiImageDropzoneProps = {
    event: Event
    variant: BuildingBlockVariant
    existingItems: BuildingBlockItem[]
    onUploaded: (newItems: BuildingBlockItem[]) => void
}
export const BlockMultiImageDropzone = ({
    event,
    variant,
    existingItems,
    onUploaded,
}: BlockMultiImageDropzoneProps) => {
    const { filesPath, isLoading, error } = useEventFiles(event)
    const { createNotification } = useNotification()
    const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)

    const onDrop = useCallback(
        async (acceptedFiles: File[]) => {
            if (!filesPath || !acceptedFiles.length) {
                return
            }
            setProgress({ done: 0, total: acceptedFiles.length })
            const usedKeys = new Set(existingItems.map((item) => item.key).filter(Boolean) as string[])
            const newItems: BuildingBlockItem[] = []

            // Sequential: keeps the drop order in the resulting items
            for (const file of acceptedFiles) {
                try {
                    const resizedImage = await resizeImage(file, 1500)
                    const url = await uploadImage(filesPath.imageFolder, resizedImage)

                    let key: string | null = null
                    if (variant === 'map') {
                        const base = slugifyBlockKey(file.name.replace(/\.[^.]+$/, '')) || 'image'
                        key = base
                        let suffix = 2
                        while (usedKeys.has(key)) {
                            key = `${base}-${suffix}`
                            suffix += 1
                        }
                        usedKeys.add(key)
                    }

                    newItems.push({
                        id: generateFirestoreId(),
                        key,
                        order: existingItems.length + newItems.length,
                        value: { url, alt: null },
                    })
                } catch (uploadError) {
                    console.error(uploadError)
                    createNotification(`Failed to upload ${file.name}`, { type: 'error' })
                }
                setProgress((current) => (current ? { ...current, done: current.done + 1 } : current))
            }

            setProgress(null)
            if (newItems.length) {
                onUploaded(newItems)
            }
        },
        [filesPath, existingItems, variant, onUploaded, createNotification]
    )

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        multiple: true,
        disabled: !!progress || isLoading || !!error || !filesPath,
        accept: {
            'image/jpeg': ['.jpg', '.jpeg'],
            'image/png': ['.png'],
            'image/webp': ['.webp'],
            'image/svg+xml': ['.svg'],
        },
    })

    return (
        <Box
            {...getRootProps()}
            sx={{
                border: `2px dashed ${isDragActive ? '#55F' : '#999'}`,
                color: 'text.secondary',
                background: 'rgba(0,0,0,0.04)',
                transition: 'all 300ms',
                borderRadius: 4,
                textAlign: 'center',
                padding: 3,
                marginTop: 2,
                cursor: progress ? 'default' : 'pointer',
                opacity: isLoading || error || !filesPath ? 0.5 : 1,
            }}>
            <input {...getInputProps()} />
            {progress ? (
                <Box display="flex" alignItems="center" justifyContent="center" gap={2}>
                    <CircularProgress size={20} />
                    <Typography>
                        Uploading {progress.done}/{progress.total}...
                    </Typography>
                </Box>
            ) : (
                <Box display="flex" alignItems="center" justifyContent="center" gap={1}>
                    <FileUploadRounded />
                    <Typography>
                        {isDragActive
                            ? 'Drop the images here to upload them all'
                            : 'Drop multiple images here (or click) to add them all at once'}
                    </Typography>
                </Box>
            )}
        </Box>
    )
}
