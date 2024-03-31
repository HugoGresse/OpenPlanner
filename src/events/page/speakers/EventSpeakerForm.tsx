import * as React from 'react'
import { Event, Speaker } from '../../../types'
import { FormContainer, TextFieldElement, useForm } from 'react-hook-form-mui'
import { Grid } from '@mui/material'
import LoadingButton from '@mui/lab/LoadingButton'
import { SpeakerSocialFields } from './SpeakerSocials'
import { ImageTextFieldElement } from '../../../components/form/ImageTextFieldElement'
import { SaveShortcut } from '../../../components/form/SaveShortcut'

export type EventSpeakerFormProps = {
    event: Event
    speaker?: Speaker
    onSubmit: (speaker: Speaker) => void
}
export const EventSpeakerForm = ({ speaker, onSubmit, event }: EventSpeakerFormProps) => {
    const formContext = useForm({
        defaultValues: speaker
            ? ({
                  ...speaker,
              } as Speaker)
            : {},
    })
    const { formState, control } = formContext

    const isSubmitting = formState.isSubmitting

    return (
        <FormContainer
            formContext={formContext}
            onSuccess={async (data) => {
                if (!data.id && speaker?.id) {
                    data.id = speaker.id
                }
                return onSubmit({
                    ...data,
                    photoUrl: data.photoUrl || speaker?.photoUrl || null,
                    note: data.note || speaker?.note || null,
                })
            }}>
            <Grid container spacing={4}>
                <Grid item xs={12} md={6}>
                    {speaker && (
                        <TextFieldElement
                            margin="dense"
                            required={!!speaker}
                            fullWidth
                            label="ID"
                            name="id"
                            variant="filled"
                            disabled={true}
                            size="small"
                        />
                    )}
                    <TextFieldElement
                        margin="dense"
                        required={true}
                        fullWidth
                        label="Name"
                        name="name"
                        variant="filled"
                        disabled={isSubmitting}
                        size="small"
                    />
                    <TextFieldElement
                        margin="dense"
                        fullWidth
                        label="Job title"
                        name="jobTitle"
                        variant="filled"
                        disabled={isSubmitting}
                        size="small"
                    />
                    <TextFieldElement
                        margin="dense"
                        fullWidth
                        label="Company"
                        name="company"
                        variant="filled"
                        disabled={isSubmitting}
                        size="small"
                    />
                    <ImageTextFieldElement
                        event={event}
                        margin="dense"
                        fullWidth
                        label="Company Logo Url"
                        name="companyLogoUrl"
                        variant="filled"
                        disabled={isSubmitting}
                        size="small"
                    />
                    <ImageTextFieldElement
                        event={event}
                        margin="dense"
                        fullWidth
                        label="Photo URL"
                        name="photoUrl"
                        variant="filled"
                        disabled={isSubmitting}
                        size="small"
                    />
                    <TextFieldElement
                        margin="dense"
                        fullWidth
                        multiline
                        minRows={4}
                        maxRows={40}
                        label="Bio"
                        name="bio"
                        variant="filled"
                        disabled={isSubmitting}
                        size="small"
                    />
                    <TextFieldElement
                        margin="dense"
                        fullWidth
                        label="Geolocation (place)"
                        name="geolocation"
                        variant="filled"
                        disabled={isSubmitting}
                        size="small"
                    />
                    <SpeakerSocialFields control={control} isSubmitting={isSubmitting} />
                </Grid>
                <Grid item xs={12} md={6}>
                    <TextFieldElement
                        margin="dense"
                        fullWidth
                        label="Email (private)"
                        name="email"
                        variant="filled"
                        disabled={isSubmitting}
                        size="small"
                        type="email"
                    />
                    <TextFieldElement
                        margin="dense"
                        fullWidth
                        label="Phone (private)"
                        name="phone"
                        variant="filled"
                        disabled={isSubmitting}
                        size="small"
                        type="phone"
                    />
                    <TextFieldElement
                        margin="dense"
                        fullWidth
                        multiline
                        minRows={4}
                        maxRows={40}
                        label="Note (private)"
                        name="note"
                        variant="filled"
                        disabled={isSubmitting}
                        size="small"
                    />
                </Grid>

                <Grid item xs={12}>
                    <LoadingButton
                        type="submit"
                        disabled={formState.isSubmitting}
                        loading={formState.isSubmitting}
                        fullWidth
                        variant="contained"
                        sx={{ mt: 2, mb: 2 }}>
                        {speaker ? 'Save' : 'Add speaker'}
                    </LoadingButton>
                </Grid>
            </Grid>
            <SaveShortcut />
        </FormContainer>
    )
}
