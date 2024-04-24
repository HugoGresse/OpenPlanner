import LoadingButton from '@mui/lab/LoadingButton'
import { Avatar, Chip, CircularProgress, Grid, IconButton, Typography } from '@mui/material'
import { useState } from 'react'
import {
    AutocompleteElement,
    CheckboxElement,
    FormContainer,
    SelectElement,
    TextFieldElement,
    useForm,
} from 'react-hook-form-mui'
import { useLocation } from 'wouter'
import { ImageTextFieldElement } from '../../../components/form/ImageTextFieldElement'
import { SaveShortcut } from '../../../components/form/SaveShortcut'
import { useSpeakers } from '../../../services/hooks/useSpeakersMap'
import { Event, Session } from '../../../types'
import { dateTimeToDayMonthHours } from '../../../utils/dates/timeFormats'
import { ExpandMore } from '@mui/icons-material'

export type EventSessionFormProps = {
    event: Event
    session?: Session
    onSubmit: (session: Session) => void
}
export const EventSessionForm = ({ event, session, onSubmit }: EventSessionFormProps) => {
    const speakers = useSpeakers(event.id)
    const [_2, setLocation] = useLocation()
    const [teasingPostsOpen, setTeasingPostsOpen] = useState<boolean>(!!session?.teasingPosts)
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
                    teasingHidden: data.teasingHidden,
                    teasingPosts: data.teasingPosts,
                    extendHeight: data.extendHeight,
                    extendWidth: data.extendWidth,
                    teaserUrl: data.teaserUrl,
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
                    <CheckboxElement label="Don't share this session on socials" name="teasingHidden" />
                </Grid>

                <Grid item xs={12}>
                    <Grid container spacing={1}>
                        <Grid item xs={6} sx={{ flexDirection: 'row', alignItems: 'center', display: 'flex' }}>
                            <Typography variant="h6">Talk announcements</Typography>
                            <IconButton onClick={() => setTeasingPostsOpen(!teasingPostsOpen)}>
                                <ExpandMore />
                            </IconButton>
                        </Grid>
                        <Grid item xs={6}>
                            {/*<LoadingButton>Generate media post</LoadingButton>*/}
                        </Grid>

                        {teasingPostsOpen && (
                            <>
                                <Grid item xs={12}>
                                    <TextFieldElement
                                        margin="dense"
                                        fullWidth
                                        multiline
                                        minRows={4}
                                        maxRows={40}
                                        label="Teaser url (video?)"
                                        name="teaserUrl"
                                        variant="filled"
                                        disabled={false}
                                    />
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <TextFieldElement
                                        margin="dense"
                                        fullWidth
                                        multiline
                                        minRows={4}
                                        maxRows={40}
                                        label="LinkedIn teasing post"
                                        name="teasingPosts.linkedin"
                                        variant="filled"
                                        disabled={false}
                                    />
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <TextFieldElement
                                        margin="dense"
                                        fullWidth
                                        multiline
                                        minRows={4}
                                        maxRows={40}
                                        label="Twitter teasing post"
                                        name="teasingPosts.twitter"
                                        variant="filled"
                                        disabled={false}
                                    />
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <TextFieldElement
                                        margin="dense"
                                        fullWidth
                                        multiline
                                        minRows={4}
                                        maxRows={40}
                                        label="Instagram teasing post"
                                        name="teasingPosts.instagram"
                                        variant="filled"
                                        disabled={false}
                                    />
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <TextFieldElement
                                        margin="dense"
                                        fullWidth
                                        multiline
                                        minRows={4}
                                        maxRows={40}
                                        label="Facebook teasing post"
                                        name="teasingPosts.facebook"
                                        variant="filled"
                                        disabled={false}
                                    />
                                </Grid>
                            </>
                        )}
                    </Grid>
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
            <SaveShortcut />
        </FormContainer>
    )
}
