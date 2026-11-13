import * as React from 'react'
import { Event } from '../../types'
import { useController } from 'react-hook-form'
import { SidePanelImageUploadControlled } from './SidePanelImageUploadControlled'

export type SidePanelImageUploadProps = {
    event: Event
    isOpen: boolean
    onClose: () => void
    title: string
    fieldName: string
    maxImageSize: number
}
// react-hook-form wrapper around SidePanelImageUploadControlled
export const SidePanelImageUpload = ({
    event,
    isOpen,
    onClose,
    title,
    fieldName,
    maxImageSize = 500,
}: SidePanelImageUploadProps) => {
    const { field } = useController({ name: fieldName })

    return (
        <SidePanelImageUploadControlled
            event={event}
            isOpen={isOpen}
            onClose={onClose}
            title={title}
            value={field.value || ''}
            onChange={field.onChange}
            maxImageSize={maxImageSize}
        />
    )
}
