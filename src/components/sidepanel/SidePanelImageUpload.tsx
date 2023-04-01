import * as React from 'react'
import { useCallback, useState } from 'react'
import { SidePanel } from './SidePanel'
import { useDropzone } from 'react-dropzone'
import { SidePanelImageUploadForm } from './SidePanelImageUploadForm'
import pica from 'pica'

export type SidePanelImageUploadProps = {
    isOpen: boolean
    onClose: () => void
    title: string
    fieldName: string
}
export const SidePanelImageUpload = ({ isOpen, onClose, title, fieldName }: SidePanelImageUploadProps) => {
    const [upload, setUpload] = useState<{
        file: File
        preview: any
    } | null>(null)
    const [uploading, setUploading] = useState(false)

    const onSave = async () => {
        setUploading(true)

        try {
            if (upload) {
                const resizedCanvas = document.createElement('canvas')
                resizedCanvas.height = 500
                resizedCanvas.width = 500
                await pica().resize(upload.file, resizedCanvas)
                // .then(result => pica.toBlob(result, 'image/jpeg', 0.90))

                console.log(upload)
            }

            onClose()
        } catch (error) {}

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

    const { getRootProps, getInputProps, open, isDragActive } = useDropzone({
        onDrop,
        multiple: false,
        noClick: true,
        noKeyboard: true,
        accept: {
            'image/jpeg': ['.png', '.jpg', '.jpeg'],
            'image/png': ['.png', '.jpg', '.jpeg'],
        },
        maxSize: 1024 * 1024,
    })

    return (
        <SidePanel onClose={onClose} isOpen={isOpen} title={title} containerProps={getRootProps()}>
            <SidePanelImageUploadForm
                uploading={uploading}
                isDragActive={isDragActive}
                file={upload}
                getInputProps={getInputProps}
                fieldName={fieldName}
                onInputClick={open}
                onSaveClick={onSave}
                helpText="PNG or JPEG image, will be resized in the browser."
            />
        </SidePanel>
    )
}
