import * as React from 'react'
import { Event, Speaker } from '../../../types'
import { FormContainer, SwitchElement, TextFieldElement, useForm } from 'react-hook-form-mui'
import { Grid, Typography } from '@mui/material'
import LoadingButton from '@mui/lab/LoadingButton'
import { SpeakerSocialFields } from './SpeakerSocials'
import { ImageTextFieldElement } from '../../../components/form/ImageTextFieldElement'
import { SaveShortcut } from '../../../components/form/SaveShortcut'

export type EventSpeakerFormProps = {
    event: Event
    speaker?: Speaker
    onSubmit: (speaker: Speaker) => void
    rightColumns?: React.ReactNode
}
export const EventSpeakerForm = ({ speaker, onSubmit, event, rightColumns }: EventSpeakerFormProps) => {
    const customFields = event.speakerCustomFields || []

    const defaultCustomFields = customFields.reduce((acc, field) => {
        acc[field.id] = field.type === 'boolean' ? false : ''
        return acc
    }, {} as { [key: string]: string | boolean })

    const formContext = useForm({
        defaultValues: speaker
            ? ({
                  ...speaker,
                  customFields: { ...defaultCustomFields, ...(speaker.customFields || {}) },
              } as Speaker)
            : { customFields: defaultCustomFields },
    })
    const { formState, control } = formContext

    const isSubmitting = formState.isSubmitting

    const publicCustomFields = customFields.filter((f) => f.privacy !== 'private')
    const privateCustomFields = customFields.filter((f) => f.privacy === 'private')

    return (
        <FormContainer
            formContext={formContext}
            onSuccess={async (data) => {
                if (!data.id && speaker?.id) {
                    data.id = speaker.id
                }
                const customFieldValues: { [key: string]: string | boolean } = {}
                for (const field of customFields) {
                    const value = data.customFields?.[field.id]
                    customFieldValues[field.id] = field.type === 'boolean' ? !!value : value || ''
                }
                return onSubmit({
                    ...data,
                    jobTitle: data.jobTitle || speaker?.jobTitle || null,
                    company: data.company || speaker?.company || null,
                    companyLogoUrl: data.companyLogoUrl || speaker?.companyLogoUrl || null,
                    email: data.email || speaker?.email || null,
                    phone: data.phone || speaker?.phone || null,
                    geolocation: data.geolocation || speaker?.geolocation || null,
                    photoUrl: data.photoUrl || speaker?.photoUrl || null,
                    note: data.note || speaker?.note || null,
                    pronouns: data.pronouns || speaker?.pronouns || null,
                    customFields: customFieldValues,
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
                    <Grid container spacing={1}>
                        <Grid item xs={9}>
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
                        </Grid>
                        <Grid item xs={3}>
                            <TextFieldElement
                                margin="dense"
                                fullWidth
                                label="Pronoun(s)"
                                name="pronouns"
                                variant="filled"
                                disabled={isSubmitting}
                                size="small"
                            />
                        </Grid>
                    </Grid>
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
                    {publicCustomFields.length > 0 && (
                        <>
                            <Typography fontWeight="600" mt={2} mb={1}>
                                Custom fields (public)
                            </Typography>
                            {publicCustomFields.map((field) =>
                                field.type === 'boolean' ? (
                                    <SwitchElement
                                        key={field.id}
                                        label={field.name}
                                        name={`customFields.${field.id}`}
                                    />
                                ) : (
                                    <TextFieldElement
                                        key={field.id}
                                        margin="dense"
                                        fullWidth
                                        label={field.name}
                                        name={`customFields.${field.id}`}
                                        variant="filled"
                                        disabled={isSubmitting}
                                        size="small"
                                    />
                                )
                            )}
                        </>
                    )}
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
                    {privateCustomFields.length > 0 && (
                        <>
                            <Typography fontWeight="600" mt={2} mb={1}>
                                Custom fields (private)
                            </Typography>
                            {privateCustomFields.map((field) =>
                                field.type === 'boolean' ? (
                                    <SwitchElement
                                        key={field.id}
                                        label={field.name}
                                        name={`customFields.${field.id}`}
                                    />
                                ) : (
                                    <TextFieldElement
                                        key={field.id}
                                        margin="dense"
                                        fullWidth
                                        label={field.name}
                                        name={`customFields.${field.id}`}
                                        variant="filled"
                                        disabled={isSubmitting}
                                        size="small"
                                    />
                                )
                            )}
                        </>
                    )}
                    {rightColumns}
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
