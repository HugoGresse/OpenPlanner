import { useEffect } from 'react'
import * as yup from 'yup'
import { doc } from 'firebase/firestore'
import { FormContainer, useForm } from 'react-hook-form-mui'
import { yupResolver } from '@hookform/resolvers/yup'
import { Button, Container, Stack, Typography } from '@mui/material'
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material'
import { Link } from 'wouter'
import { Event, EventSettingForForm } from '../../../types'
import { collections } from '../../../services/firebase'
import { useFirestoreDocumentMutation } from '../../../services/hooks/firestoreMutationHooks'
import { useNotification } from '../../../hooks/notificationHook'
import { mapEventDevSettingsFormToMutateObject } from '../settings/mapEventSettingsFormToMutateObject'
import { SaveShortcut } from '../../../components/form/SaveShortcut'
import { SlackChatSection } from '../api/components/SlackChatSection'

const schema = yup
    .object({
        slackBotToken: yup.string().nullable(),
        slackSigningSecret: yup.string().nullable(),
    })
    .required()

// Full settings shape: mapEventDevSettingsFormToMutateObject reads webhooks/apiKey/publicEnabled/repoUrl
// from the submitted data, so omitting them would wipe them.
const convertInputEvent = (event: Event): EventSettingForForm => ({
    ...event,
    webhooks: event.webhooks || [],
    apiKey: event.apiKey,
    publicEnabled: event.publicEnabled || false,
    repoUrl: event.repoUrl || null,
    repoToken: event.repoToken || null,
    slackBotToken: event.slackBotToken || '',
    slackSigningSecret: event.slackSigningSecret || '',
})

export type EventSlackProps = {
    event: Event
}

export const EventSlack = ({ event }: EventSlackProps) => {
    const mutation = useFirestoreDocumentMutation(doc(collections.events, event.id))
    const { createNotification } = useNotification()
    const formContext = useForm({ defaultValues: convertInputEvent(event) })
    const { formState, reset } = formContext

    useEffect(() => {
        reset(convertInputEvent(event))
    }, [event])

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography component="h1" variant="h5">
                    Slack chat assistant
                </Typography>
                <Button component={Link} to="/api" variant="outlined" startIcon={<ArrowBackIcon />}>
                    Integration & API
                </Button>
            </Stack>
            <FormContainer
                formContext={formContext}
                // @ts-ignore
                resolver={yupResolver(schema)}
                onSuccess={async (data) => {
                    await mutation.mutate(mapEventDevSettingsFormToMutateObject(event, data))
                    createNotification('Slack configuration saved', { type: 'success' })
                }}>
                <SlackChatSection event={event} isSubmitting={formState.isSubmitting} />
                <SaveShortcut />
            </FormContainer>
        </Container>
    )
}
