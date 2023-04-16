import * as React from 'react'
import {
    AutocompleteElement,
    CheckboxElement,
    FormContainer,
    SelectElement,
    TextFieldElement,
    useForm,
} from 'react-hook-form-mui'
import { Avatar, Chip, CircularProgress, Grid, Typography } from '@mui/material'
import { Event, Session } from '../../../types'
import { dateTimeToDayMonthHours } from '../../../utils/dates/timeFormats'
import { useSpeakers } from '../../../services/hooks/useSpeakersMap'
import LoadingButton from '@mui/lab/LoadingButton'
import { ImageTextFieldElement } from '../../../components/form/ImageTextFieldElement'
import { useLocation } from 'wouter'

export type EventSessionFormProps = {
    event: Event
    session?: Session
    onSubmit: (session: Session) => void
}
export const EventSessionForm = ({ event, session, onSubmit }: EventSessionFormProps) => {
    const speakers = useSpeakers(event.id)
    const [_2, setLocation] = useLocation()
    const track = event.tracks.find((t) => t.id === session?.trackId)?.name || null
    const formContext = useForm({
        defaultValues: session
            ? ({
                  ...session,
                  track: track,
                  category: session.category || undefined,
                  format: session.format || undefined,
                  language: session.language || undefined,
                  level: session.level || undefined,
                  note: session.note || undefined,
                  showInFeedback: session.showInFeedback,
              } as Session)
            : ({
                  showInFeedback: true,
                  hideTrackTitle: false,
              } as Session),
    })
    const { formState } = formContext

    const isSubmitting = formState.isSubmitting

    const startAt = session?.dates?.start ? dateTimeToDayMonthHours(session.dates?.start) : 'not set'
    const endAt = session?.dates?.end ? dateTimeToDayMonthHours(session.dates?.end) : 'not set'

    return (
        <FormContainer
            formContext={formContext}
            onSuccess={async (data) => {
                return onSubmit({
                    title: data.title,
                    speakers: data.speakers || [],
                    abstract: data.abstract,
                    format: data.format,
                    category: data.category,
                    hideTrackTitle: data.hideTrackTitle,
                    showInFeedback: data.showInFeedback,
                    imageUrl: data.imageUrl,
                    videoLink: data.videoLink,
                    presentationLink: data.presentationLink,
                    language: data.language,
                    level: data.level,
                    note: data.note,
                    extendHeight: data.extendHeight,
                    extendWidth: data.extendWidth,
                } as Session)
            }}>
            <Grid container spacing={4}>
                <Grid item xs={12} md={6}>
                    <TextFieldElement
                        margin="dense"
                        required={!!session}
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
                                photoUrl: s.photoUrl,
                            }))}
                            textFieldProps={{
                                variant: 'filled',
                                margin: 'dense',
                            }}
                            autocompleteProps={{
                                renderTags: (value, getTagProps) =>
                                    value.map((option, index) => {
                                        return (
                                            <Chip
                                                avatar={<Avatar alt={option?.label} src={option?.photoUrl} />}
                                                label={option?.label || 'Deleted'}
                                                onClick={() => {
                                                    setLocation(`/speakers/${option?.id}?fromSession=true`)
                                                }}
                                                sx={{ cursor: 'pointer' }}
                                                {...getTagProps({ index })}
                                            />
                                        )
                                    }),
                            }}
                        />
                    )}

                    <TextFieldElement
                        margin="dense"
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
                        Last for <b>{session?.durationMinutes}</b> minutes in track <b>{track ? track : 'not set'}</b>
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
                    <Grid container spacing={4}>
                        <Grid item xs={12} md={6}>
                            <ImageTextFieldElement
                                event={event}
                                margin="dense"
                                fullWidth
                                label="Image URL"
                                name="imageUrl"
                                variant="filled"
                                disabled={isSubmitting}
                                maxImageSize={1500}
                            />
                        </Grid>
                    </Grid>
                    <Grid container spacing={4}>
                        <Grid item xs={12} md={6}>
                            <TextFieldElement
                                margin="dense"
                                fullWidth
                                label="Extend Width"
                                name="extendWidth"
                                variant="filled"
                                disabled={isSubmitting}
                                type="number"
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextFieldElement
                                label="Extend height"
                                name="extendHeight"
                                variant="filled"
                                margin="dense"
                                fullWidth
                                disabled={isSubmitting}
                                type="number"
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
                        {session ? 'Save' : 'Add session'}
                    </LoadingButton>
                </Grid>
            </Grid>
        </FormContainer>
    )
}
