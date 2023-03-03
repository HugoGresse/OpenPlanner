import * as React from 'react'
import { Event, EventForForm } from '../../../types'
import { yupResolver } from '@hookform/resolvers/yup'
import { Card, Grid, Typography } from '@mui/material'
import { FormContainer, TextFieldElement, useForm } from 'react-hook-form-mui'
import LoadingButton from '@mui/lab/LoadingButton'
import * as yup from 'yup'
import { slugify } from '../../../utils/slugify'
import { TrackFields } from './components/TrackFields'
import { WebhooksFields } from './components/WebhooksFields'
import { collections } from '../../../services/firebase'
import { useFirestoreDocumentMutation } from '@react-query-firebase/firestore'
import { doc } from 'firebase/firestore'
import { DateTime } from 'luxon'
import { diffDays } from '../../../utils/diffDays'

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
    const mutation = useFirestoreDocumentMutation(doc(collections.events, event.id), {
        merge: true,
    })

    const formContext = useForm({
        defaultValues: convertInputEvent(event),
    })
    const { control, formState, reset, watch } = formContext

    const days = diffDays(watch('dates.start'), watch('dates.end'))

    return (
        <FormContainer
            formContext={formContext}
            resolver={yupResolver(schema)}
            onSuccess={async (data) => {
                const eventName = data.name
                const tracks = data.tracks
                    .filter((track) => track.name && track.name.trim().length > 0)
                    .map((track) => ({
                        name: track.name.trim(),
                        id: track.id.startsWith('autogenerated-') ? slugify(track.name.trim()) : track.id,
                    }))
                const webhooks = data.webhooks.map((webhook) => {
                    if (event.webhooks.find((w) => w.url === webhook.url)) {
                        return webhook
                    }
                    return {
                        url: webhook.url.trim(),
                        lastAnswer: undefined,
                    }
                })
                const dates = {
                    start: data.dates.start ? (DateTime.fromISO(data.dates.start).toJSDate() as Date) : null,
                    end: data.dates.end ? (DateTime.fromISO(data.dates.end).toJSDate() as Date) : null,
                }

                return mutation.mutateAsync(
                    {
                        ...event,
                        name: eventName,
                        dates,
                        tracks,
                        webhooks,
                    },
                    {
                        async onSuccess() {
                            eventUpdated().then((result) => reset(convertInputEvent(result.data)))
                        },
                    }
                )
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
    )
}
