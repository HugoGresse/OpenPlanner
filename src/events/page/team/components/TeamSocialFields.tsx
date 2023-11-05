import * as React from 'react'
import { Box, IconButton, Typography } from '@mui/material'
import { Control, TextFieldElement, useFieldArray } from 'react-hook-form-mui'
import { Add, Delete } from '@mui/icons-material'
import { Social, TeamMember } from '../../../../types'

export type TeamSocialsFieldsProps = {
    control: Control<TeamMember, any>
    isSubmitting: boolean
}
type TeamSocialsWithKey = Social & { key: string }
export const TeamSocialFields = ({ control, isSubmitting }: TeamSocialsFieldsProps) => {
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
                {fields.map((social: TeamSocialsWithKey, index) => (
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
