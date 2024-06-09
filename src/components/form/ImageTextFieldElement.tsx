import * as React from 'react'
import { useState } from 'react'
import { FieldValues } from 'react-hook-form/dist/types/fields'
import { TextFieldElement, TextFieldElementProps, useWatch } from 'react-hook-form-mui'
import { Box, IconButton, InputAdornment } from '@mui/material'
import { Download, Image } from '@mui/icons-material'
import { SidePanelImageUpload } from '../sidepanel/SidePanelImageUpload'
import { Event } from '../../types'
import { triggerFileDownload } from '../../utils/triggerFileDownload'

export const ImageTextFieldElement = <TFieldValues extends FieldValues = FieldValues>({
    event,
    maxImageSize = 500,
    fileSuffix = '',
    ...otherProps
}: TextFieldElementProps<TFieldValues> & { event: Event; maxImageSize?: number; fileSuffix?: string }) => {
    const fieldValue = useWatch({ name: otherProps.name })
    const [isSidePanelOpen, setSidePanelOpen] = useState(false)

    const openSidePanel = () => {
        setSidePanelOpen(true)
    }

    const fieldValueExtension = fieldValue?.split('.').pop()

    return (
        <>
            <TextFieldElement
                {...otherProps}
                InputProps={{
                    endAdornment: (
                        <Box display="flex" alignItems="center" ml={1} sx={{ cursor: 'pointer' }}>
                            {fieldValue && (
                                <>
                                    <img src={fieldValue} width={30} onClick={openSidePanel} alt="Preview" />
                                    <IconButton
                                        aria-label="download image"
                                        disabled={!fieldValue}
                                        onClick={async () => {
                                            await triggerFileDownload(
                                                fieldValue,
                                                `OpenPlanner-${fileSuffix}.${fieldValueExtension}`
                                            )
                                        }}
                                        edge="end">
                                        <Download />
                                    </IconButton>
                                </>
                            )}
                            <InputAdornment position="end">
                                <IconButton
                                    aria-label="add image"
                                    onClick={openSidePanel}
                                    onMouseDown={openSidePanel}
                                    edge="end">
                                    <Image />
                                </IconButton>
                            </InputAdornment>
                        </Box>
                    ),
                }}
            />
            <SidePanelImageUpload
                event={event}
                isOpen={isSidePanelOpen}
                onClose={() => setSidePanelOpen(false)}
                title={'Add image'}
                fieldName={otherProps.name}
                maxImageSize={maxImageSize}
            />
        </>
    )
}
