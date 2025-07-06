import * as React from 'react'
import { useCallback, useEffect, useState } from 'react'
import { SidePanel } from './SidePanel'
import { useDropzone } from 'react-dropzone'
import { SidePanelImageUploadForm } from './SidePanelImageUploadForm'
import { resizeImage } from '../../utils/images/resizeImage'
import { uploadImage } from '../../utils/images/uploadImage'
import { Event } from '../../types'
import { useController } from 'react-hook-form'
import { useNotification } from '../../hooks/notificationHook'
import { useClipboardImage } from '../form/useClipboardImage'
import { useEventFiles } from '../../services/hooks/useEventFiles'

export type SidePanelImageUploadProps = {
    event: Event
    isOpen: boolean
    onClose: () => void
    title: string
    fieldName: string
    maxImageSize: number
}
export const SidePanelImageUpload = ({
    event,
    isOpen,
    onClose,
    title,
    fieldName,
    maxImageSize = 500,
}: SidePanelImageUploadProps) => {
    const { filesPath, isLoading, error } = useEventFiles(event)
    const { field } = useController({ name: fieldName })
    const { createNotification } = useNotification()
    const [upload, setUpload] = useState<{
        file: File
        preview: any
    } | null>(null)
    const [uploading, setUploading] = useState(false)

    useEffect(() => {
        if (error) {
            createNotification('Error loading files path. Upload functionality may not work properly.', {
                type: 'error',
            })
        }
    }, [error, createNotification])

    const imageFromClipboard = useClipboardImage(isOpen)

    useEffect(() => {
        if (imageFromClipboard && !upload) {
            setUpload({
                file: imageFromClipboard,
                preview: URL.createObjectURL(imageFromClipboard),
            })
        }
    }, [imageFromClipboard])

    const onSave = async () => {
        if (!filesPath) {
            createNotification('Cannot upload image: files path not available', { type: 'error' })
            return
        }

        setUploading(true)

        try {
            if (upload) {
                const resizedImage = await resizeImage(upload.file, maxImageSize)
                const imagePath = await uploadImage(filesPath.imageFolder, resizedImage)
                field.onChange(imagePath)
            }

            onClose()
        } catch (error) {
            createNotification('Error while resizing image or uploading it (check JS console?)', { type: 'error' })
            console.log(error)
        }

        setUploading(false)
    }

    const onDrop = useCallback((acceptedFiles: File[]) => {
        if (acceptedFiles.length > 0) {
            setUpload({
                file: acceptedFiles[0],
                preview: URL.createObjectURL(acceptedFiles[0]),
            })
        }
    }, [])

    // Handle cropped image data
    const handleImageChange = useCallback((file: File, preview: string) => {
        setUpload({
            file,
            preview,
        })
    }, [])

    const { getRootProps, getInputProps, open, isDragActive } = useDropzone({
        onDrop,
        multiple: false,
        noClick: true,
        noKeyboard: true,
        accept: {
            'image/jpeg': ['.png', '.jpg', '.jpeg'],
            'image/png': ['.png', '.jpg', '.jpeg'],
            'image/svg+xml': ['.svg'],
        },
    })

    return (
        <SidePanel onClose={onClose} isOpen={isOpen} title={title} containerProps={getRootProps()}>
            <SidePanelImageUploadForm
                uploading={uploading || isLoading}
                isDragActive={isDragActive}
                file={upload}
                getInputProps={getInputProps}
                fieldName={fieldName}
                onInputClick={open}
                onSaveClick={onSave}
                onImageChange={handleImageChange}
                helpText="SVG images are recommended. PNG or JPEG image, will be resized in the browser. You can also paste image directly from clipboard."
                disabled={isLoading || !!error || !filesPath}
            />
        </SidePanel>
    )
}
