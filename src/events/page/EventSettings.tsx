import * as React from 'react'
import { Event, Track } from '../../types'
import { yupResolver } from '@hookform/resolvers/yup'
import { Box, Card, Grid, IconButton, Typography } from '@mui/material'
import { FormContainer, TextFieldElement, useFieldArray, useForm } from 'react-hook-form-mui'
import LoadingButton from '@mui/lab/LoadingButton'
import * as yup from 'yup'
import { Delete } from '@mui/icons-material'

const schema = yup
    .object({
        email: yup.string().email().required(),
        password: yup.string().min(5).max(255).trim().required(),
    })
    .required()

export type EventSettingsProps = {
    event: Event
}
export const EventSettings = ({ event }: EventSettingsProps) => {
    const formContext = useForm({
        defaultValues: event,
    })
    const { watch, setValue, control, formState } = formContext

    const { fields, append, remove } = useFieldArray({
        control,
        name: 'tracks',
    })

    console.log(fields)

    return (
        <FormContainer
            formContext={formContext}
            resolver={yupResolver(schema)}
            onSuccess={async (data) => {
                const eventName = data.name
                const tracks = data.tracks.filter((track) => track.name && track.name.trim().length > 0)
                console.log('save', data)
                // TODO
            }}>
            <Typography component="h1" variant="h5">
                Event settings
            </Typography>
            <Grid container spacing={2} component={Card}>
                <Grid item xs={6}>
                    <TextFieldElement
                        margin="normal"
                        required
                        fullWidth
                        id="name"
                        label="Event name"
                        name="name"
                        variant="filled"
                        disabled={formState.isSubmitting}
                    />

                    <Typography>Tracks:</Typography>

                    <Box paddingLeft={2}>
                        {fields.map((track: Track, index) => (
                            <Box display="flex">
                                <TextFieldElement
                                    key={track.id}
                                    id={track.id}
                                    label={`id: ${track.id}`}
                                    name={`tracks.${index}.name`}
                                    variant="filled"
                                    size="small"
                                    disabled={formState.isSubmitting}
                                />

                                <IconButton
                                    aria-label="Remove track"
                                    onClick={() => {
                                        setValue(`tracks.${index}.name`, '')
                                        remove(index)
                                    }}
                                    edge="end">
                                    <Delete />
                                </IconButton>
                            </Box>
                        ))}
                        <TextFieldElement
                            label="Add track here"
                            name={`tracks.${event.tracks.length}.name`}
                            variant="filled"
                            size="small"
                            margin="dense"
                            disabled={formState.isSubmitting}
                        />
                    </Box>
                </Grid>

                <Grid item xs={12}>
                    <LoadingButton
                        type="submit"
                        disabled={formState.isSubmitting}
                        loading={formState.isSubmitting}
                        fullWidth
                        variant="contained"
                        sx={{ mt: 2, mb: 2 }}>
                        Save
                    </LoadingButton>
                </Grid>
            </Grid>
        </FormContainer>
    )
}
