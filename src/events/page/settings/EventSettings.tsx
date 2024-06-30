import { yupResolver } from '@hookform/resolvers/yup'
import {
    Box,
    Button,
    Card,
    Checkbox,
    Container,
    DialogContentText,
    FormControlLabel,
    Grid,
    Typography,
} from '@mui/material'
import { FormContainer, TextFieldElement, useForm } from 'react-hook-form-mui'
import LoadingButton from '@mui/lab/LoadingButton'
import { doc } from 'firebase/firestore'
import { DateTime } from 'luxon'
import { useEffect, useState } from 'react'
import { useLocation } from 'wouter'
import * as yup from 'yup'
import { ConfirmDialog } from '../../../components/ConfirmDialog'
import { RequireConferenceHallLogin } from '../../../conferencehall/RequireConferenceHallLogin'
import { useNotification } from '../../../hooks/notificationHook'
import { collections } from '../../../services/firebase'
import {
    useFirestoreDocumentDeletion,
    useFirestoreDocumentMutation,
} from '../../../services/hooks/firestoreMutationHooks'
import { Event, EventForForm } from '../../../types'
import { diffDays } from '../../../utils/dates/diffDays'
import { deleteSessionsAndSpeakers } from '../../actions/deleteSessionsAndSpeakers'
import { reImportSessionsSpeakersFromConferenceHall } from '../../actions/reImportSessionsSpeakersFromConferenceHall'
import { CategoriesFields } from './components/CategoriesFields'
import { FormatsFields } from './components/FormatsFields'
import { TrackFields } from './components/TrackFields'
import { mapEventSettingsFormToMutateObject } from './mapEventSettingsFormToMutateObject'
import { SaveShortcut } from '../../../components/form/SaveShortcut'
import { ConferenceHallEventsPicker } from '../../../conferencehall/ConferenceHallEventsPicker'
import { linkOpenPlannerEventToConferenceHallEvent } from '../../actions/linkOpenPlannerEventToConferenceHallEvent'
import { EventSettingsFormatCategoriesGrid } from './EventSettingsFormatCategoriesGrid'
import { ImageTextFieldElement } from '../../../components/form/ImageTextFieldElement'
import * as React from 'react'

const schema = yup
    .object({
        name: yup.string().required(),
    })
    .required()

const convertInputEvent = (event: Event): EventForForm => {
    return {
        ...event,
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
    const [reImportOpen, setReimportOpen] = useState(false)
    const [reImportCategoriesFormats, setReImportCategoriesFormat] = useState(false)
    const [attachToConferenceHallOpen, setAttachToConferenceHallOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const { createNotification } = useNotification()
    const documentDeletion = useFirestoreDocumentDeletion(doc(collections.events, event.id))
    const mutation = useFirestoreDocumentMutation(doc(collections.events, event.id))

    const formContext = useForm({
        defaultValues: convertInputEvent(event),
    })
    const { control, formState, reset, watch } = formContext

    const days = diffDays(watch('dates.start'), watch('dates.end'))

    useEffect(() => {
        reset(convertInputEvent(event))
    }, [event])

    return (
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
                    <Grid container spacing={4}>
                        <Grid item xs={12} md={6}>
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
                        </Grid>
                        <Grid item xs={12} md={6}>
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
                            {days ? days + ' day(s)' : ''}
                        </Grid>
                    </Grid>

                    <Grid container spacing={4}>
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

                            <TextFieldElement
                                label="Color"
                                name="color"
                                variant="filled"
                                size="small"
                                margin="dense"
                                type="color"
                                InputLabelProps={{ shrink: true }}
                                disabled={formState.isSubmitting}
                                sx={{ minWidth: 150, mr: 1 }}
                            />
                            <TextFieldElement
                                label="Color secondary"
                                name="colorSecondary"
                                variant="filled"
                                size="small"
                                margin="dense"
                                type="color"
                                InputLabelProps={{ shrink: true }}
                                disabled={formState.isSubmitting}
                                sx={{ minWidth: 150, mr: 1 }}
                            />
                            <TextFieldElement
                                label="Color background"
                                name="colorBackground"
                                variant="filled"
                                size="small"
                                margin="dense"
                                type="color"
                                InputLabelProps={{ shrink: true }}
                                disabled={formState.isSubmitting}
                                sx={{ minWidth: 150 }}
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <Typography fontWeight="600" mt={2}>
                                Other stuffs
                            </Typography>

                            <TextFieldElement
                                margin="normal"
                                fullWidth
                                id="openAPIKey"
                                label="OpenAI API key"
                                name="openAPIKey"
                                variant="filled"
                                disabled={formState.isSubmitting}
                            />

                            <TextFieldElement
                                margin="normal"
                                fullWidth
                                id="gladiaAPIKey"
                                label="Gladia.io API key"
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
                        </Grid>
                    </Grid>
                    <Grid container spacing={4}>
                        <Grid item xs={12} md={6}>
                            <TrackFields control={control} isSubmitting={formState.isSubmitting} />
                            <FormatsFields control={control} isSubmitting={formState.isSubmitting} />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <CategoriesFields control={control} isSubmitting={formState.isSubmitting} />
                        </Grid>
                        <Grid item xs={12}>
                            <EventSettingsFormatCategoriesGrid event={event} />
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
                </Card>
                {!deleteOpen && !reImportOpen && <SaveShortcut />}
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
                        await deleteSessionsAndSpeakers(event, false)
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

                {!!event.conferenceHallId && (
                    <Button color="warning" onClick={() => setReimportOpen(true)}>
                        Re-import from ConferenceHall
                    </Button>
                )}

                <ConfirmDialog
                    open={reImportOpen}
                    title="Re-import from Conference Hall?"
                    acceptButton="Re-import"
                    disabled={loading}
                    loading={loading}
                    cancelButton="cancel"
                    handleClose={() => setReimportOpen(false)}
                    handleAccept={async () => {
                        setLoading(true)
                        await reImportSessionsSpeakersFromConferenceHall(event, reImportCategoriesFormats)
                        setLoading(false)
                        setReimportOpen(false)
                        createNotification('Data imported', { type: 'success' })
                    }}>
                    <DialogContentText>
                        Re-import the whole event data from ConferenceHall. It will:
                        <br />
                        <br />
                        - erase all speakers & sessions linked to equivalent entities on ConferenceHall
                        <br />
                        - have up to date data from ConferenceHall
                        <br />
                        - cannot be cancelled (it would be cool to have versioning in the future though...)
                        <br />
                        <br />
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={reImportCategoriesFormats}
                                    onChange={(e) => {
                                        setReImportCategoriesFormat(e.target.checked)
                                    }}
                                    inputProps={{ 'aria-label': 'controlled' }}
                                />
                            }
                            label="Replace categories & formats?"
                        />
                    </DialogContentText>

                    <RequireConferenceHallLogin>
                        {(conferenceHallUserId) => {
                            if (conferenceHallUserId) {
                                return null
                            }
                            return <Typography>Login to ConferenceHall first!</Typography>
                        }}
                    </RequireConferenceHallLogin>
                </ConfirmDialog>

                {!event.conferenceHallId && (
                    <Button color="warning" onClick={() => setAttachToConferenceHallOpen(true)}>
                        Attach event to a ConferenceHall event
                    </Button>
                )}
                <ConfirmDialog
                    open={attachToConferenceHallOpen}
                    title="Attach this OpenPlanner event to an existing ConferenceHall event?"
                    disabled={loading}
                    loading={loading}
                    cancelButton="cancel"
                    handleClose={() => setAttachToConferenceHallOpen(false)}
                    handleAccept={() => null}>
                    <DialogContentText>
                        Attach this OpenPlanner event to an existing ConferenceHall event. It is useful when you have
                        used OpenPlanner without importing the event from ConferenceHall before hand. This will not
                        display the same setup as the regular "New event from ConferenceHall" but using the below
                        features, it should cover most things :
                        <br />
                        <br />
                        - "Re-import from ConferenceHall" (from the Event settings page)
                        <br />
                        - "Import sessions" (from the Sessions page)
                        <br />
                        <br />
                    </DialogContentText>

                    <RequireConferenceHallLogin>
                        {(conferenceHallUserId) => {
                            if (conferenceHallUserId) {
                                return (
                                    <>
                                        <Box display="flex" alignItems="center" marginY={2}>
                                            <Typography variant="h4">
                                                2. Select the event you want to attach to
                                            </Typography>
                                        </Box>
                                        <ConferenceHallEventsPicker
                                            onEventPicked={async (chEvent) => {
                                                await linkOpenPlannerEventToConferenceHallEvent(event.id, chEvent.id)
                                                setAttachToConferenceHallOpen(false)
                                                createNotification('ConferenceHall event linked/attached', {
                                                    type: 'success',
                                                })
                                                setReimportOpen(true)
                                            }}
                                            userId={conferenceHallUserId}
                                        />
                                    </>
                                )
                            }
                            return <Typography>Login to ConferenceHall first!</Typography>
                        }}
                    </RequireConferenceHallLogin>
                </ConfirmDialog>
            </Box>
        </Container>
    )
}
