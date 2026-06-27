import * as yup from 'yup'
import { Event, EventSettingForForm } from '../../../types'
import { useEffect } from 'react'
import { useFirestoreDocumentMutation } from '../../../services/hooks/firestoreMutationHooks'
import { doc } from 'firebase/firestore'
import { collections } from '../../../services/firebase'
import { FormContainer, useForm, SwitchElement, TextFieldElement } from 'react-hook-form-mui'
import { Card, Container, Grid, Typography, Box } from '@mui/material'
import { yupResolver } from '@hookform/resolvers/yup'
import { mapEventDevSettingsFormToMutateObject } from '../settings/mapEventSettingsFormToMutateObject'
import LoadingButton from '@mui/lab/LoadingButton'
import { SaveShortcut } from '../../../components/form/SaveShortcut'
import { TypographyCopyable } from '../../../components/TypographyCopyable'
import { PdfScheduleSection } from '../../../components/PdfScheduleSection'
import { TextFieldElementPrivate } from '../../../components/form/TextFieldElementPrivate'

const schema = yup
    .object({
        name: yup.string().required(),
        publicEnabled: yup.boolean().optional(),
        intermissionMediaUrl: yup.string().nullable(),
        intermissionPassword: yup.string().nullable(),
        gladiaAPIKey: yup.string().nullable(),
        transcriptionPassword: yup.string().nullable(),
    })
    .required()

const convertInputEvent = (event: Event): EventSettingForForm => {
    return {
        ...event,
        webhooks: event.webhooks || [],
        apiKey: event.apiKey,
        publicEnabled: event.publicEnabled || false,
        repoUrl: event.repoUrl || null,
        repoToken: event.repoToken || null,
        intermissionMediaUrl: event.intermissionMediaUrl || null,
        intermissionPassword: event.intermissionPassword || '',
        gladiaAPIKey: event.gladiaAPIKey || '',
        transcriptionPassword: event.transcriptionPassword || '',
    }
}

export type EventPublicProps = {
    event: Event
}
export const EventPublic = ({ event }: EventPublicProps) => {
    const mutation = useFirestoreDocumentMutation(doc(collections.events, event.id))

    const formContext = useForm({
        defaultValues: convertInputEvent(event),
    })
    const { formState, reset, watch } = formContext
    const publicEnabled = watch('publicEnabled')

    useEffect(() => {
        reset(convertInputEvent(event))
    }, [event])

    const eventPublicUrl = `${window.location.protocol}//${window.location.host}/public/event/${event.id}`
    const intermissionUrl = `${eventPublicUrl}/intermission`
    const transcriptionUrl = `${eventPublicUrl}/transcription`
    const transcriptionPassword = watch('transcriptionPassword')

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <FormContainer
                formContext={formContext}
                // @ts-ignore
                resolver={yupResolver(schema)}
                onSuccess={async (data) => {
                    return mutation.mutate(mapEventDevSettingsFormToMutateObject(event, data))
                }}>
                <Typography component="h1" variant="h5">
                    Public
                </Typography>

                <Card sx={{ paddingX: 2, mt: 2 }}>
                    <Typography fontSize="large" sx={{ mt: 2, mb: 2 }}>
                        Website
                    </Typography>
                    <Box mb={2}>
                        <SwitchElement label="Enable public website" name="publicEnabled" />
                        {publicEnabled && (
                            <Box mt={1}>
                                <TypographyCopyable>{eventPublicUrl}</TypographyCopyable>
                            </Box>
                        )}
                    </Box>

                    <PdfScheduleSection event={event} />

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
                </Card>

                <Card sx={{ paddingX: 2, mt: 4 }}>
                    <Typography fontSize="large" sx={{ mt: 2, mb: 1 }}>
                        Intermission screen
                    </Typography>
                    <Typography variant="body2" color="text.secondary" mb={2}>
                        Full-screen display to show between talks: an autoplay background media with the next talk
                        overlaid. Open it on the room screen and pick the track on first load.
                    </Typography>
                    <TextFieldElement
                        margin="normal"
                        fullWidth
                        id="intermissionMediaUrl"
                        label="Background media URL (video or image)"
                        name="intermissionMediaUrl"
                        helperText="Direct link to an .mp4/.webm video (autoplay, muted, looped) or an image"
                    />
                    <TextFieldElement
                        margin="normal"
                        fullWidth
                        id="intermissionPassword"
                        label="Intermission password (optional)"
                        name="intermissionPassword"
                        variant="filled"
                        helperText="Leave empty for no password. Separate from the transcription password."
                    />
                    <Box mt={1}>
                        <Typography variant="body2" gutterBottom>
                            Intermission screen URL
                        </Typography>
                        <TypographyCopyable singleLine={true}>{intermissionUrl}</TypographyCopyable>
                    </Box>

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
                </Card>

                <Card sx={{ paddingX: 2, mt: 4 }}>
                    <Typography fontSize="large" sx={{ mt: 2, mb: 1 }}>
                        Transcription & captions
                    </Typography>
                    <Typography variant="body2" color="text.secondary" mb={2}>
                        Powers the live caption page and the intermission screen. The password protects access to both
                        (and to the Gladia.io key).
                    </Typography>
                    <TextFieldElementPrivate
                        margin="normal"
                        fullWidth
                        id="gladiaAPIKey"
                        label="Gladia.io API key or token"
                        name="gladiaAPIKey"
                        variant="filled"
                        helperText="Used for the transcription pages. Set the password below or the Gladia.io API key could be accessed freely."
                        disabled={formState.isSubmitting}
                    />
                    <TextFieldElement
                        margin="normal"
                        fullWidth
                        id="transcriptionPassword"
                        label="Password to access transcription"
                        name="transcriptionPassword"
                        variant="filled"
                        disabled={formState.isSubmitting}
                    />
                    {transcriptionPassword && transcriptionPassword.length > 0 ? (
                        <Box mt={1}>
                            <Typography variant="body2" gutterBottom>
                                Transcription page URL
                            </Typography>
                            <TypographyCopyable singleLine={true}>{transcriptionUrl}</TypographyCopyable>
                        </Box>
                    ) : null}

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
                </Card>
                <SaveShortcut />
            </FormContainer>
        </Container>
    )
}
