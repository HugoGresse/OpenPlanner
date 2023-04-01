import * as React from 'react'
import { useState } from 'react'
import { FieldValues } from 'react-hook-form/dist/types/fields'
import { TextFieldElement, TextFieldElementProps } from 'react-hook-form-mui'
import { IconButton, InputAdornment } from '@mui/material'
import { Image } from '@mui/icons-material'
import { SidePanelImageUpload } from '../sidepanel/SidePanelImageUpload'

export const ImageTextFieldElement = <TFieldValues extends FieldValues = FieldValues>(
    props: TextFieldElementProps<TFieldValues>
) => {
    const [isSidePanelOpen, setSidePanelOpen] = useState(false)

    const openSidePanel = () => {
        setSidePanelOpen(true)
    }

    return (
        <>
            <TextFieldElement
                {...props}
                InputProps={{
                    endAdornment: (
                        <InputAdornment position="end">
                            <IconButton
                                aria-label="add image"
                                onClick={openSidePanel}
                                onMouseDown={openSidePanel}
                                edge="end">
                                <Image />
                            </IconButton>
                        </InputAdornment>
                    ),
                }}
            />
            <SidePanelImageUpload
                isOpen={isSidePanelOpen}
                onClose={() => setSidePanelOpen(false)}
                title={'Add image'}
                fieldName={props.name}
            />
        </>
    )
}
