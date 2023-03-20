import * as React from 'react'
import {
    AutocompleteElement,
    CheckboxElement,
    FormContainer,
    SelectElement,
    TextFieldElement,
    useForm,
} from 'react-hook-form-mui'
import { CircularProgress, Grid, Typography } from '@mui/material'
import { Event, Session } from '../../../types'
import { dateTimeToDayMonthHours } from '../../../utils/timeFormats'
import { useSpeakers } from '../../../services/hooks/useSpeakersMap'
import LoadingButton from '@mui/lab/LoadingButton'
import { useFirestoreDocumentMutation } from '@react-query-firebase/firestore'
import { doc } from 'firebase/firestore'
import { collections } from '../../../services/firebase'

export type EventSessionFormProps = {
    event: Event
    session: Session
}
export const EventSessionForm = ({ event, session }: EventSessionFormProps) => {
    const speakers = useSpeakers(event.id)
    const mutation = useFirestoreDocumentMutation(doc(collections.sessions(event.id), session.id), {
        merge: true,
    })
    const track = event.tracks.find((t) => t.id === session.trackId)?.name || null
    const formContext = useForm({
        defaultValues: {
            ...session,
            track: track,
            category: session.category || undefined,
        },
    })
    const { formState } = formContext

    const isSubmitting = formState.isSubmitting

    const startAt = session.dates?.start ? dateTimeToDayMonthHours(session.dates?.start) : 'not set'
    const endAt = session.dates?.end ? dateTimeToDayMonthHours(session.dates?.end) : 'not set'

    return (
        <FormContainer
            formContext={formContext}
            onSuccess={async (data) => {
                return mutation.mutateAsync({
                    title: data.title,
                    speakers: data.speakers,
                    abstract: data.abstract,
                    format: data.format,
                    category: data.category,
                    hideTrackTitle: data.hideTrackTitle,
                    showInFeedback: data.showInFeedback,
                    videoLink: data.videoLink,
                    presentationLink: data.presentationLink,
                    language: data.language,
                    level: data.level,
                    note: data.note,
                } as Session)
            }}>
            <Grid container spacing={4}>
                <Grid item xs={12} md={6}>
                    <TextFieldElement
                        margin="dense"
                        required
                        fullWidth
                        label="ID"
                        name="id"
                        variant="filled"
                        disabled={true}
                        size="small"
                    />
                    <TextFieldElement
                        margin="dense"
                        required
                        fullWidth
                        label="title"
                        name="title"
                        variant="filled"
                        disabled={isSubmitting}
                    />

                    {speakers.isLoading || !speakers.data ? (
                        <CircularProgress />
                    ) : (
                        <AutocompleteElement
                            name="speakers"
                            label="Speakers"
                            multiple
                            matchId
                            options={speakers.data.map((s) => ({
                                id: s.id,
                                label: s.name,
                            }))}
                            textFieldProps={{
                                variant: 'filled',
                                margin: 'dense',
                            }}
                        />
                    )}

                    <TextFieldElement
                        margin="dense"
                        required
                        fullWidth
                        multiline
                        minRows={4}
                        maxRows={40}
                        label="Abstract"
                        name="abstract"
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
                        label="Note (private, for organisers)"
                        name="note"
                        variant="filled"
                        disabled={isSubmitting}
                    />
                </Grid>
                <Grid item xs={12} md={6}>
                    <Typography gutterBottom>
                        Start at: {startAt}
                        <br />
                        End at: {endAt}
                        <br />
                        Last for <b>{session.durationMinutes}</b> minutes in track <b>{track ? track : 'not set'}</b>
                    </Typography>
                    <br />
                    <Grid container spacing={4}>
                        <Grid item xs={12} md={6}>
                            <SelectElement
                                label="Format"
                                name="format"
                                fullWidth
                                margin="dense"
                                variant="filled"
                                options={event.formats.map((f) => ({
                                    id: f.id,
                                    label: f.name,
                                }))}
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <SelectElement
                                label="Category"
                                name="category"
                                fullWidth
                                margin="dense"
                                variant="filled"
                                options={event.categories.map((c) => ({
                                    id: c.id,
                                    label: c.name,
                                }))}
                            />
                        </Grid>
                    </Grid>
                    <Grid container spacing={4}>
                        <Grid item xs={12} md={6}>
                            <TextFieldElement
                                label="Language"
                                name="language"
                                variant="filled"
                                margin="dense"
                                fullWidth
                                disabled={isSubmitting}
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextFieldElement
                                label="Level"
                                name="level"
                                variant="filled"
                                margin="dense"
                                fullWidth
                                disabled={isSubmitting}
                            />
                        </Grid>
                    </Grid>
                    <Grid container spacing={4}>
                        <Grid item xs={12} md={6}>
                            <TextFieldElement
                                label="Presentation URL"
                                name="presentationLink"
                                variant="filled"
                                margin="dense"
                                fullWidth
                                disabled={isSubmitting}
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextFieldElement
                                label="Video URL"
                                name="videoLink"
                                variant="filled"
                                margin="dense"
                                fullWidth
                                disabled={isSubmitting}
                            />
                        </Grid>
                    </Grid>
                    <CheckboxElement label="Hide track title" name="hideTrackTitle" />
                    <CheckboxElement label="Show in feedback" name="showInFeedback" />
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
