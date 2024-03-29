import * as React from 'react'
import { Box, IconButton, Typography } from '@mui/material'
import { Control, TextFieldElement, useFieldArray } from 'react-hook-form-mui'
import { Add, Delete } from '@mui/icons-material'
import { EventForForm, Format } from '../../../../types'

export type FormatsFieldsProps = {
    control: Control<EventForForm, any>
    isSubmitting: boolean
}
type FormatWithKey = Format & { key: string }
export const FormatsFields = ({ control, isSubmitting }: FormatsFieldsProps) => {
    const { fields, append, remove } = useFieldArray({
        control,
        name: 'formats',
        keyName: 'key',
    })

    return (
        <>
            <Typography fontWeight="600" mt={2}>
                Formats
            </Typography>

            <Box paddingLeft={2}>
                {fields.map((format: FormatWithKey, index) => (
                    <Box display="flex" key={format.key}>
                        <TextFieldElement
                            id={format.key}
                            label={`id: ${format.id}`}
                            name={`formats.${index}.name`}
                            control={control}
                            variant="filled"
                            size="small"
                            margin="dense"
                            disabled={isSubmitting}
                        />
                        <TextFieldElement
                            id={format.key}
                            label="Duration minutes"
                            name={`formats.${index}.durationMinutes`}
                            control={control}
                            variant="filled"
                            size="small"
                            margin="dense"
                            disabled={isSubmitting}
                            type={'number'}
                            inputProps={{
                                inputMode: 'numeric',
                                pattern: '[0-9]*',
                            }}
                        />

                        <IconButton
                            aria-label="Remove format"
                            onClick={() => {
                                remove(index)
                            }}
                            edge="end">
                            <Delete />
                        </IconButton>
                    </Box>
                ))}
                <IconButton
                    aria-label="Add format"
                    onClick={() => {
                        append({
                            id: `autogenerated-${Date.now()}`,
                            durationMinutes: 20,
                            name: '',
                        })
                    }}>
                    <Add />
                </IconButton>
            </Box>
        </>
    )
}
