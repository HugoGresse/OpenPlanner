import { yupResolver } from '@hookform/resolvers/yup'
import { Box, Button, Card, Container, DialogContentText, Grid, Typography, IconButton, Collapse } from '@mui/material'
import { FormContainer, TextFieldElement, useForm } from 'react-hook-form-mui'
import LoadingButton from '@mui/lab/LoadingButton'
import { doc } from 'firebase/firestore'
import { DateTime } from 'luxon'
import { useState } from 'react'
import { useLocation } from 'wouter'
import * as yup from 'yup'
import { ExpandMore as ExpandMoreIcon } from '@mui/icons-material'
import { ConfirmDialog } from '../../../components/ConfirmDialog'
import { useNotification } from '../../../hooks/notificationHook'
import { collections } from '../../../services/firebase'
import {
    useFirestoreDocumentDeletion,
    useFirestoreDocumentMutation,
} from '../../../services/hooks/firestoreMutationHooks'
import { Event, EventForForm } from '../../../types'
import { diffDays } from '../../../utils/dates/diffDays'
import { deleteSessionsAndSpeakers } from '../../actions/deleteSessionsAndSpeakers'
import { CategoriesFields } from './components/CategoriesFields'
import { FormatsFields } from './components/FormatsFields'
import { TrackFields } from './components/TrackFields'
import { mapEventSettingsFormToMutateObject } from './mapEventSettingsFormToMutateObject'
import { SaveShortcut } from '../../../components/form/SaveShortcut'
import { EventSettingsFormatCategoriesGrid } from './EventSettingsFormatCategoriesGrid'
import { ImageTextFieldElement } from '../../../components/form/ImageTextFieldElement'
import { TextFieldElementPrivate } from '../../../components/form/TextFieldElementPrivate'
import { Title } from '@mui/icons-material'

const schema = yup
    .object({
        name: yup.string().required(),
        timezone: yup.string().required(),
    })
    .required()

const convertInputEvent = (event: Event): EventForForm => {
    return {
        ...event,
        timezone: event.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
        dates: {
            start: event.dates.start ? DateTime.fromJSDate(event.dates.start).toFormat("kkkk-LL-dd'T'T") : null,
            end: event.dates.end ? DateTime.fromJSDate(event.dates.end).toFormat("kkkk-LL-dd'T'T") : null,
        },
    }
}

export type EventSettingsProps = {
    event: Event
}
export const EventSettings = ({ event }: EventSettingsProps) => {
    const [_, setLocation] = useLocation()
    const [deleteOpen, setDeleteOpen] = useState(false)
    const [expandedGeneralInfo, setExpandedGeneralInfo] = useState(true)
    const [expandedMoreDetails, setExpandedMoreDetails] = useState(true)
    const [expandedTracks, setExpandedTracks] = useState(true)
    const { createNotification } = useNotification()
    const documentDeletion = useFirestoreDocumentDeletion(doc(collections.events, event.id))
    const mutation = useFirestoreDocumentMutation(doc(collections.events, event.id))

    const formContext = useForm({
        defaultValues: convertInputEvent(event),
    })
    const { control, formState, watch } = formContext

    const days = diffDays(watch('dates.start'), watch('dates.end'))

    return (
        <>
            <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
                <FormContainer
                    formContext={formContext}
                    // @ts-ignore
                    resolver={yupResolver(schema)}
                    onSuccess={async (data) => {
                        return mutation.mutate(mapEventSettingsFormToMutateObject(event, data))
                    }}>
                    <Typography component="h1" variant="h5">
                        Event settings
                    </Typography>
                    <Card sx={{ paddingX: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 2 }}>
                            <Typography fontSize="large" sx={{ mt: 2 }}>
                                {' '}
                                General Information{' '}
                            </Typography>
                            <IconButton
                                size="small"
                                onClick={() => setExpandedGeneralInfo(!expandedGeneralInfo)}
                                sx={{
                                    transform: expandedGeneralInfo ? 'rotate(0deg)' : 'rotate(-90deg)',
                                    transition: '0.3s',
                                }}>
                                <ExpandMoreIcon />
                            </IconButton>
                        </Box>
                        <Collapse in={expandedGeneralInfo}>
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
                            <TextFieldElement
                                margin="normal"
                                required
                                fullWidth
                                id="dates.start"
                                label="Start date"
                                name="dates.start"
                                variant="filled"
                                type="datetime-local"
                                InputLabelProps={{ shrink: true }}
                                disabled={formState.isSubmitting}
                            />
                            <TextFieldElement
                                margin="normal"
                                required
                                fullWidth
                                id="dates.end"
                                label="End date"
                                name="dates.end"
                                variant="filled"
                                type="datetime-local"
                                InputLabelProps={{ shrink: true }}
                                disabled={formState.isSubmitting}
                            />
                            <TextFieldElement
                                margin="normal"
                                required
                                fullWidth
                                id="timezone"
                                label="Timezone"
                                name="timezone"
                                variant="filled"
                                disabled={formState.isSubmitting}
                                helperText="eg: Europe/Paris"
                            />
                            {days ? days + ' day(s)' : ''}

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
                                {mutation.error && <Typography color="error">{mutation.error.message}</Typography>}
                            </Grid>
                        </Collapse>
                    </Card>

                    <Card sx={{ paddingX: 2, mt: 4 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 2 }}>
                            <Typography fontSize="large" sx={{ mt: 2 }}>
                                {' '}
                                More details{' '}
                            </Typography>
                            <IconButton
                                size="small"
                                onClick={() => setExpandedMoreDetails(!expandedMoreDetails)}
                                sx={{
                                    transform: expandedMoreDetails ? 'rotate(0deg)' : 'rotate(-90deg)',
                                    transition: '0.3s',
                                }}>
                                <ExpandMoreIcon />
                            </IconButton>
                        </Box>
                        <Collapse in={expandedMoreDetails}>
                            <Grid container spacing={2}>
                                <Grid item xs={12} md={6}>
                                    <Typography fontWeight="600" mt={2}>
                                        Event details & theme
                                    </Typography>

                                    <TextFieldElement
                                        margin="dense"
                                        fullWidth
                                        id="eventLocation"
                                        label="Location name (.locationName)"
                                        name="locationName"
                                        variant="filled"
                                        size="small"
                                        disabled={formState.isSubmitting}
                                    />
                                    <TextFieldElement
                                        margin="dense"
                                        fullWidth
                                        id="eventLocationUrl"
                                        label="Location url (.locationUrl)"
                                        name="locationUrl"
                                        variant="filled"
                                        size="small"
                                        disabled={formState.isSubmitting}
                                    />

                                    <ImageTextFieldElement
                                        event={event}
                                        margin="dense"
                                        fullWidth
                                        label="Logo (.logoUrl)"
                                        name="logoUrl"
                                        variant="filled"
                                        disabled={formState.isSubmitting}
                                        size="small"
                                    />
                                    <ImageTextFieldElement
                                        event={event}
                                        margin="dense"
                                        fullWidth
                                        label="Logo 2 (.logoUrl2)"
                                        name="logoUrl2"
                                        variant="filled"
                                        disabled={formState.isSubmitting}
                                        size="small"
                                    />
                                    <ImageTextFieldElement
                                        event={event}
                                        margin="dense"
                                        fullWidth
                                        label="Background image (.backgroundUrl) used for ShortVid.io"
                                        name="backgroundUrl"
                                        variant="filled"
                                        disabled={formState.isSubmitting}
                                        size="small"
                                    />

                                    <Grid container spacing={1}>
                                        <Grid item xs={12} sm={6} md={4}>
                                            <TextFieldElement
                                                label="Color"
                                                name="color"
                                                variant="filled"
                                                size="small"
                                                margin="dense"
                                                type="color"
                                                InputLabelProps={{ shrink: true }}
                                                disabled={formState.isSubmitting}
                                                fullWidth
                                            />
                                        </Grid>
                                        <Grid item xs={12} sm={6} md={4}>
                                            <TextFieldElement
                                                label="Color secondary"
                                                name="colorSecondary"
                                                variant="filled"
                                                size="small"
                                                margin="dense"
                                                type="color"
                                                InputLabelProps={{ shrink: true }}
                                                disabled={formState.isSubmitting}
                                                fullWidth
                                            />
                                        </Grid>
                                        <Grid item xs={12} sm={6} md={4}>
                                            <TextFieldElement
                                                label="Color background"
                                                name="colorBackground"
                                                variant="filled"
                                                size="small"
                                                margin="dense"
                                                type="color"
                                                InputLabelProps={{ shrink: true }}
                                                disabled={formState.isSubmitting}
                                                fullWidth
                                            />
                                        </Grid>
                                    </Grid>
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <Typography fontWeight="600" mt={2}>
                                        Other stuffs
                                    </Typography>

                                    <TextFieldElementPrivate
                                        margin="normal"
                                        fullWidth
                                        id="openAPIKey"
                                        label="OpenAI API key"
                                        name="openAPIKey"
                                        variant="filled"
                                        disabled={formState.isSubmitting}
                                    />

                                    <TextFieldElementPrivate
                                        margin="normal"
                                        fullWidth
                                        id="gladiaAPIKey"
                                        label="Gladia.io API key or token"
                                        name="gladiaAPIKey"
                                        variant="filled"
                                        helperText="Used for the transcription pages. Don't forget to set the password below or the Gladia.io API Key could be accessed freely"
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
                                    {event.transcriptionPassword && event.transcriptionPassword.length > 0 ? (
                                        <p>
                                            <a
                                                target="_blank"
                                                href={`${
                                                    window.location.hostname === 'localhost'
                                                        ? 'http://localhost:3000'
                                                        : 'https://openplanner.fr'
                                                }/public/event/${event.id}/transcription`}>
                                                Transcription page url
                                            </a>
                                        </p>
                                    ) : null}
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
                                    Save
                                </LoadingButton>
                                {mutation.error && <Typography color="error">{mutation.error.message}</Typography>}
                            </Grid>
                        </Collapse>
                    </Card>

                    <Card sx={{ paddingX: 2, mt: 4 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 2 }}>
                            <Typography fontSize="large" sx={{ mt: 2 }}>
                                {' '}
                                Tracks, formats & categories{' '}
                            </Typography>
                            <IconButton
                                size="small"
                                onClick={() => setExpandedTracks(!expandedTracks)}
                                sx={{
                                    transform: expandedTracks ? 'rotate(0deg)' : 'rotate(-90deg)',
                                    transition: '0.3s',
                                }}>
                                <ExpandMoreIcon />
                            </IconButton>
                        </Box>
                        <Collapse in={expandedTracks}>
                            <Grid container spacing={4}>
                                <Grid item xs={12} md={6}>
                                    <TrackFields control={control} isSubmitting={formState.isSubmitting} />
                                    <FormatsFields control={control} isSubmitting={formState.isSubmitting} />
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <CategoriesFields control={control} isSubmitting={formState.isSubmitting} />
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
                                    {mutation.error && <Typography color="error">{mutation.error.message}</Typography>}
                                </Grid>
                            </Grid>
                        </Collapse>
                    </Card>
                    {!deleteOpen && <SaveShortcut />}
                </FormContainer>

                <Box mt={2}>
                    <Button color="warning" onClick={() => setDeleteOpen(true)}>
                        Delete event
                    </Button>

                    <ConfirmDialog
                        open={deleteOpen}
                        title="Delete the event?"
                        acceptButton="Delete event"
                        disabled={documentDeletion.isLoading}
                        loading={documentDeletion.isLoading}
                        cancelButton="cancel"
                        handleClose={() => setDeleteOpen(false)}
                        handleAccept={async () => {
                            await deleteSessionsAndSpeakers(event)
                            await documentDeletion.mutate()
                            setDeleteOpen(false)
                            createNotification('Event deleted', { type: 'success' })
                            setLocation('../../')
                        }}>
                        <DialogContentText id="alert-dialog-description">
                            {' '}
                            Delete event and all data within it. This is final and cannot be undone.
                        </DialogContentText>
                    </ConfirmDialog>
                </Box>
            </Container>
            <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
                <Card sx={{ padding: 2 }}>
                    <Grid item xs={12}>
                        <EventSettingsFormatCategoriesGrid event={event} />
                    </Grid>
                </Card>
            </Container>
        </>
    )
}
