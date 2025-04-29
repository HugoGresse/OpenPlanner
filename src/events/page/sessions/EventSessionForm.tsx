import LoadingButton from '@mui/lab/LoadingButton'
import { Avatar, Button, Chip, CircularProgress, Grid, IconButton, Typography } from '@mui/material'
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
import { Event, Session, TeasingPosts } from '../../../types'
import { dateTimeToDayMonthHours } from '../../../utils/dates/timeFormats'
import { ExpandMore } from '@mui/icons-material'
import { VideoTextFieldElement } from '../../../components/form/VideoTextFieldElement'
import { GenerateSessionsVideoDialog } from './components/GenerateSessionsVideoDialog'
import { GenerateSessionsTextContentDialog } from './components/GenerateSessionsTextContentDialog'
import { SendSettionToBupher } from '../social/SendSessionToBupher'

export type EventSessionFormProps = {
    event: Event
    session?: Session
    onSubmit: (session: Session) => void
}
export const EventSessionForm = ({ event, session, onSubmit }: EventSessionFormProps) => {
    const speakers = useSpeakers(event.id)
    const [_2, setLocation] = useLocation()
    const [generateMediaOpen, setGenerateMediaOpen] = useState<boolean>(false)
    const [generateTextOpen, setGenerateTextOpen] = useState<boolean>(false)
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
                  showInFeedback: session.showInFeedback || false,
                  teasingHidden: session.teasingHidden || false,
                  hideTrackTitle: session.hideTrackTitle || false,
              } as Session)
            : ({
                  showInFeedback: true,
                  hideTrackTitle: false,
                  teasingHidden: false,
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
                const teasingPosts: TeasingPosts = {
                    linkedin: data.teasingPosts?.linkedin || null,
                    twitter: data.teasingPosts?.twitter || null,
                    instagram: data.teasingPosts?.instagram || null,
                    facebook: data.teasingPosts?.facebook || null,
                    bluesky: data.teasingPosts?.bluesky || null,
                }
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
                    teasingPosts: teasingPosts,
                    extendHeight: data.extendHeight,
                    extendWidth: data.extendWidth,
                    teaserVideoUrl: data.teaserVideoUrl,
                    teaserImageUrl: data.teaserImageUrl,
                    announcedOn: {
                        twitter: data.announcedOn?.twitter || false,
                        linkedin: data.announcedOn?.linkedin || false,
                        facebook: data.announcedOn?.facebook || false,
                        instagram: data.announcedOn?.instagram || false,
                        bluesky: data.announcedOn?.bluesky || false,
                    },
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
                                                avatar={
                                                    <Avatar alt={option?.label} src={option.photoUrl || undefined} />
                                                }
                                                label={option?.label || 'Deleted'}
                                                onClick={() => {
                                                    setLocation(`/speakers/${option?.id}?fromSession=${session?.id}`)
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
                                    label: `${f.name} (${f.durationMinutes} min)`,
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
                                fileSuffix={session?.title}
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
                        <Grid
                            item
                            xs={12}
                            sx={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                display: 'flex',
                            }}>
                            <Typography variant="h6">Talk announcements</Typography>
                            <IconButton onClick={() => setTeasingPostsOpen(!teasingPostsOpen)}>
                                <ExpandMore />
                            </IconButton>
                            <Button onClick={() => setGenerateMediaOpen(true)}>Generate media</Button>
                            <Button onClick={() => setGenerateTextOpen(true)}>Generate text</Button>
                            {session && <SendSettionToBupher event={event} session={session} />}
                        </Grid>

                        {teasingPostsOpen && (
                            <>
                                <Grid item xs={12} sm={6}>
                                    <VideoTextFieldElement
                                        margin="dense"
                                        fullWidth
                                        minRows={4}
                                        maxRows={40}
                                        label="Teaser video url"
                                        name="teaserVideoUrl"
                                        variant="filled"
                                        disabled={false}
                                        filePrefix={session?.id || session?.title || undefined}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <ImageTextFieldElement
                                        event={event}
                                        margin="dense"
                                        fullWidth
                                        minRows={4}
                                        maxRows={40}
                                        label="Teaser image url"
                                        name="teaserImageUrl"
                                        variant="filled"
                                        fileSuffix={'session-' + session?.title}
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
                                <Grid item xs={12} md={6}>
                                    <TextFieldElement
                                        margin="dense"
                                        fullWidth
                                        multiline
                                        minRows={4}
                                        maxRows={40}
                                        label="Bluesky teasing post"
                                        name="teasingPosts.bluesky"
                                        variant="filled"
                                        disabled={false}
                                    />
                                </Grid>
                            </>
                        )}
                    </Grid>
                </Grid>
                <Grid item xs={12}>
                    <Grid container spacing={1}></Grid>
                    <Typography variant="h6">Announced on:</Typography>
                    <Grid container spacing={2}>
                        <Grid item xs={3}>
                            <CheckboxElement label="Twitter" name="announcedOn.twitter" />
                        </Grid>
                        <Grid item xs={3}>
                            <CheckboxElement label="LinkedIn" name="announcedOn.linkedin" />
                        </Grid>
                        <Grid item xs={3}>
                            <CheckboxElement label="Facebook" name="announcedOn.facebook" />
                        </Grid>
                        <Grid item xs={3}>
                            <CheckboxElement label="Instagram" name="announcedOn.instagram" />
                        </Grid>
                        <Grid item xs={3}>
                            <CheckboxElement label="Bluesky" name="announcedOn.bluesky" />
                        </Grid>
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

            {generateMediaOpen && (
                <GenerateSessionsVideoDialog
                    isOpen={generateMediaOpen}
                    onClose={() => {
                        setGenerateMediaOpen(false)
                    }}
                    event={event}
                    sessions={session ? [session] : []}
                    forceGenerate={true}
                    onSuccess={({ imageUrl, videoUrl }) => {
                        formContext.setValue('teaserImageUrl', imageUrl)
                        formContext.setValue('teaserVideoUrl', videoUrl)
                    }}
                />
            )}
            {generateTextOpen && (
                <GenerateSessionsTextContentDialog
                    isOpen={generateTextOpen}
                    onClose={() => {
                        setGenerateTextOpen(false)
                    }}
                    event={event}
                    sessions={session ? [session] : []}
                    forceGenerate={true}
                    onSuccess={(data) => {
                        Object.keys(data).forEach((key) => {
                            // @ts-ignore
                            formContext.setValue(`teasingPosts.${key}`, data[key])
                        })
                    }}
                />
            )}
            <SaveShortcut />
        </FormContainer>
    )
}
