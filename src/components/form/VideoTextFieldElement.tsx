import * as React from 'react'
import { useState } from 'react'
import { FieldValues } from 'react-hook-form/dist/types/fields'
import { TextFieldElement, TextFieldElementProps, useWatch } from 'react-hook-form-mui'
import { Box, IconButton, InputAdornment } from '@mui/material'
import { Download, VideoFile } from '@mui/icons-material'
import { SidePanelVideoPreview } from '../sidepanel/SidePanelVideoPreview'
import { triggerFileDownload } from '../../utils/triggerFileDownload'

export const VideoTextFieldElement = <TFieldValues extends FieldValues = FieldValues>({
    filePrefix,
    ...otherProps
}: TextFieldElementProps<TFieldValues> & { filePrefix?: string }) => {
    const fieldValue = useWatch({ name: otherProps.name })
    const [isSidePanelOpen, setSidePanelOpen] = useState(false)

    const openSidePanel = () => {
        setSidePanelOpen(true)
    }

    return (
        <>
            <TextFieldElement
                {...otherProps}
                InputProps={{
                    endAdornment: (
                        <Box display="flex" alignItems="center" ml={1} sx={{ cursor: 'pointer' }}>
                            <InputAdornment position="end">
                                <IconButton
                                    aria-label="download video"
                                    disabled={!fieldValue}
                                    onClick={async () => {
                                        await triggerFileDownload(fieldValue, `${filePrefix || 'OpenPlanner'}.mp4`)
                                    }}
                                    edge="end">
                                    <Download />
                                </IconButton>
                            </InputAdornment>
                            <InputAdornment position="end">
                                <IconButton
                                    aria-label="preview video"
                                    onClick={openSidePanel}
                                    onMouseDown={openSidePanel}
                                    edge="end">
                                    <VideoFile />
                                </IconButton>
                            </InputAdornment>
                        </Box>
                    ),
                }}
            />
            <SidePanelVideoPreview
                isOpen={isSidePanelOpen}
                onClose={() => setSidePanelOpen(false)}
                title={'Video preview'}
                filePrefix={filePrefix}
                fieldName={otherProps.name}
            />
        </>
    )
}
