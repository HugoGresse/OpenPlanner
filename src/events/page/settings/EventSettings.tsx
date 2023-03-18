import * as React from 'react'
import { useState } from 'react'
import { Event, EventForForm } from '../../../types'
import { yupResolver } from '@hookform/resolvers/yup'
import { Box, Button, Card, Container, DialogContentText, Grid, Typography } from '@mui/material'
import { FormContainer, TextFieldElement, useForm } from 'react-hook-form-mui'
import LoadingButton from '@mui/lab/LoadingButton'
import * as yup from 'yup'
import { TrackFields } from './components/TrackFields'
import { WebhooksFields } from './components/WebhooksFields'
import { collections } from '../../../services/firebase'
import { useFirestoreDocumentDeletion, useFirestoreDocumentMutation } from '@react-query-firebase/firestore'
import { doc } from 'firebase/firestore'
import { DateTime } from 'luxon'
import { diffDays } from '../../../utils/diffDays'
import { ConfirmDialog } from '../../../components/ConfirmDialog'
import { useLocation } from 'wouter'
import { queryClient } from '../../../App'
import { FormatsFields } from './components/FormatsFields'
import { mapEventSettingsFormToMutateObject } from './mapEventSettingsFormToMutateObject'
import { reImportSessionsSpeakersFromConferenceHall } from '../../actions/reImportSessionsSpeakersFromConferenceHall'
import { RequireConferenceHallLogin } from '../../../conferencehall/RequireConferenceHallLogin'
import { useNotification } from '../../../hooks/notificationHook'
import { deleteSessionsAndSpeakers } from '../../actions/deleteSessionsAndSpeakers'

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
    eventUpdated: () => Promise<any>
}
export const EventSettings = ({ event, eventUpdated }: EventSettingsProps) => {
    const [_, setLocation] = useLocation()
    const [deleteOpen, setDeleteOpen] = useState(false)
    const [reImportOpen, setReimportOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const { createNotification } = useNotification()
    const documentDeletion = useFirestoreDocumentDeletion(doc(collections.events, event.id))
    const mutation = useFirestoreDocumentMutation(doc(collections.events, event.id), {
        merge: true,
    })

    const formContext = useForm({
        defaultValues: convertInputEvent(event),
    })
    const { control, formState, reset, watch } = formContext

    const days = diffDays(watch('dates.start'), watch('dates.end'))

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <FormContainer
                formContext={formContext}
                resolver={yupResolver(schema)}
                onSuccess={async (data) => {
                    return mutation.mutateAsync(mapEventSettingsFormToMutateObject(event, data), {
                        async onSuccess() {
                            eventUpdated().then((result) => reset(convertInputEvent(result.data)))
                        },
                    })
                }}>
                <Typography component="h1" variant="h5">
                    Event settings
                </Typography>
                <Card sx={{ paddingX: 2 }}>
                    <Grid container spacing={4}>
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

                            <TrackFields control={control} isSubmitting={formState.isSubmitting} />

                            <FormatsFields control={control} isSubmitting={formState.isSubmitting} />

                            <WebhooksFields control={control} isSubmitting={formState.isSubmitting} />
                        </Grid>
                        <Grid item xs={6}>
                            <TextFieldElement
                                margin="normal"
                                required
                                fullWidth
                                id="dates.start"
                                label="Start date"
                                name="dates.start"
                                variant="filled"
                                type="datetime-local"
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
                                disabled={formState.isSubmitting}
                            />
                            {days ? days + ' day(s)' : ''}
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
                </Card>
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
                        setLocation('../../')
                        setDeleteOpen(false)
                        await queryClient.invalidateQueries('events')
                        createNotification('Event deleted', { type: 'success' })
                    }}>
                    <DialogContentText id="alert-dialog-description">
                        {' '}
                        Delete event and all data within it. This is final and cannot be undone.
                    </DialogContentText>
                </ConfirmDialog>

                <Button color="warning" onClick={() => setReimportOpen(true)}>
                    Re-import from ConferenceHall
                </Button>

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
                        await reImportSessionsSpeakersFromConferenceHall(event)
                        setLoading(false)
                        setReimportOpen(false)
                        await queryClient.invalidateQueries(['event', event.id])
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
            </Box>
        </Container>
    )
}
