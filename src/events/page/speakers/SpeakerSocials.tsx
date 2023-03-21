import * as React from 'react'
import { Box, IconButton, Typography } from '@mui/material'
import { Control, TextFieldElement, useFieldArray } from 'react-hook-form-mui'
import { Add, Delete } from '@mui/icons-material'
import { Speaker, SpeakerSocial } from '../../../types'

export type SpeakerSocialsFieldsProps = {
    control: Control<Speaker, any>
    isSubmitting: boolean
}
type SpeakerSocialsWithKey = SpeakerSocial & { key: string }
export const SpeakerSocialFields = ({ control, isSubmitting }: SpeakerSocialsFieldsProps) => {
    const { fields, append, remove } = useFieldArray({
        control,
        name: 'socials',
        keyName: 'key',
    })

    return (
        <>
            <Typography fontWeight="600" mt={2}>
                Socials
            </Typography>

            <Box paddingLeft={2}>
                {fields.map((social: SpeakerSocialsWithKey, index) => (
                    <Box display="flex" key={social.key}>
                        <TextFieldElement
                            id={social.key}
                            label="Social name"
                            name={`socials.${index}.name`}
                            control={control}
                            variant="filled"
                            size="small"
                            margin="dense"
                            disabled={isSubmitting}
                        />
                        <TextFieldElement
                            id={social.key}
                            label="Icon"
                            name={`socials.${index}.icon`}
                            control={control}
                            variant="filled"
                            size="small"
                            margin="dense"
                            disabled={isSubmitting}
                        />
                        <TextFieldElement
                            id={social.key}
                            label="URL"
                            name={`socials.${index}.link`}
                            control={control}
                            variant="filled"
                            size="small"
                            margin="dense"
                            disabled={isSubmitting}
                        />

                        <IconButton
                            aria-label="Remove social"
                            onClick={() => {
                                remove(index)
                            }}
                            edge="end">
                            <Delete />
                        </IconButton>
                    </Box>
                ))}
                <IconButton
                    aria-label="Add social"
                    onClick={() => {
                        append({
                            name: '',
                            icon: '',
                            link: '',
                        })
                    }}>
                    <Add />
                </IconButton>
            </Box>
        </>
    )
}
