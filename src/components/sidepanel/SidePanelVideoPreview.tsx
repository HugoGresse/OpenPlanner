import * as React from 'react'
import { SidePanel } from './SidePanel'
import { useController } from 'react-hook-form'
import { Button } from '@mui/material'
import { Download } from '@mui/icons-material'
import { triggerFileDownload } from '../../utils/triggerFileDownload'

export type SidePanelVideoPreviewProps = {
    isOpen: boolean
    onClose: () => void
    title: string
    fieldName: string
    filePrefix?: string
}
export const SidePanelVideoPreview = ({
    isOpen,
    onClose,
    title,
    fieldName,
    filePrefix,
}: SidePanelVideoPreviewProps) => {
    const { field } = useController({ name: fieldName })

    const videoUrl = field.value

    return (
        <SidePanel onClose={onClose} isOpen={isOpen} title={title}>
            <video
                controls
                src={videoUrl}
                style={{
                    width: '100%',
                    borderRadius: 1,
                    border: '4px solid #EEE',
                }}
            />
            <a href={videoUrl} download={'video.mp4'}>
                Download
            </a>
            <Button
                variant="contained"
                endIcon={<Download />}
                sx={{ mt: 2 }}
                onClick={async () => {
                    await triggerFileDownload(videoUrl, `${filePrefix || 'OpenPlanner'}`)
                }}>
                Download
            </Button>

            <Button variant="contained" onClick={onClose} sx={{ mt: 2 }}>
                Close
            </Button>
        </SidePanel>
    )
}
