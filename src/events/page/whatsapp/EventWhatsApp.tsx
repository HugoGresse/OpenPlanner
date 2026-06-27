import * as yup from 'yup'
import { useEffect, useState } from 'react'
import { doc } from 'firebase/firestore'
import { FormContainer, useForm, TextFieldElement } from 'react-hook-form-mui'
import { Box, Card, Container, Grid, TextField, Typography } from '@mui/material'
import { yupResolver } from '@hookform/resolvers/yup'
import LoadingButton from '@mui/lab/LoadingButton'
import { Event, EventSettingForForm } from '../../../types'
import { collections } from '../../../services/firebase'
import { useFirestoreDocumentMutation } from '../../../services/hooks/firestoreMutationHooks'
import { mapEventDevSettingsFormToMutateObject } from '../settings/mapEventSettingsFormToMutateObject'
import { TextFieldElementPrivate } from '../../../components/form/TextFieldElementPrivate'
import { SaveShortcut } from '../../../components/form/SaveShortcut'
import { fetchOpenPlannerApi } from '../../../services/hooks/useOpenPlannerApi'
import { useNotification } from '../../../hooks/notificationHook'
import { TrackManagementSection } from './TrackManagementSection'

const schema = yup
    .object({
        greenApiInstanceId: yup.string().nullable(),
        greenApiToken: yup.string().nullable(),
    })
    .required()

// Carry the full settings shape (not just the GreenAPI fields): mapEventDevSettingsFormToMutateObject
// reads webhooks/apiKey/publicEnabled/repoUrl from the submitted data, so omitting them would wipe them.
const convertInputEvent = (event: Event): EventSettingForForm => ({
    ...event,
    webhooks: event.webhooks || [],
    apiKey: event.apiKey,
    publicEnabled: event.publicEnabled || false,
    repoUrl: event.repoUrl || null,
    repoToken: event.repoToken || null,
    greenApiInstanceId: event.greenApiInstanceId || '',
    greenApiToken: event.greenApiToken || '',
})

export type EventWhatsAppProps = {
    event: Event
}

export const EventWhatsApp = ({ event }: EventWhatsAppProps) => {
    const mutation = useFirestoreDocumentMutation(doc(collections.events, event.id))
    const { createNotification } = useNotification()

    const formContext = useForm({ defaultValues: convertInputEvent(event) })
    const { formState, reset } = formContext

    useEffect(() => {
        reset(convertInputEvent(event))
    }, [event])

    const isConfigured = Boolean(event.greenApiInstanceId && event.greenApiToken)

    const [to, setTo] = useState('')
    const [message, setMessage] = useState('Test message from OpenPlanner ✅')
    const [sending, setSending] = useState(false)

    const sendTest = async () => {
        setSending(true)
        try {
            await fetchOpenPlannerApi(event, 'whatsapp/send-test', {
                method: 'POST',
                body: { to, message },
            })
            createNotification('WhatsApp message sent', { type: 'success' })
        } catch (error) {
            createNotification('Failed to send: ' + (error instanceof Error ? error.message : 'Unknown error'), {
                type: 'error',
            })
        } finally {
            setSending(false)
        }
    }

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Typography component="h1" variant="h5">
                WhatsApp (track management)
            </Typography>

            <Card sx={{ paddingX: 2, mt: 2 }}>
                <FormContainer
                    formContext={formContext}
                    // @ts-ignore
                    resolver={yupResolver(schema)}
                    onSuccess={async (data) => mutation.mutate(mapEventDevSettingsFormToMutateObject(event, data))}>
                    <Typography fontSize="large" sx={{ mt: 2, mb: 1 }}>
                        GreenAPI credentials
                    </Typography>
                    <Typography variant="body2" color="text.secondary" mb={2}>
                        Create an instance on{' '}
                        <a href="https://green-api.com" target="_blank" rel="noreferrer">
                            green-api.com
                        </a>{' '}
                        and paste its instance id and API token. Messages are sent server-side, so the token never
                        leaves the backend.
                    </Typography>
                    <TextFieldElement
                        margin="normal"
                        fullWidth
                        id="greenApiInstanceId"
                        label="GreenAPI instance id"
                        name="greenApiInstanceId"
                        helperText="e.g. 7105xxxxxx"
                    />
                    <TextFieldElementPrivate
                        margin="normal"
                        fullWidth
                        id="greenApiToken"
                        label="GreenAPI API token"
                        name="greenApiToken"
                        variant="filled"
                    />
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
                    <SaveShortcut />
                </FormContainer>
            </Card>

            {isConfigured && <TrackManagementSection event={event} />}

            <Card sx={{ paddingX: 2, mt: 4, mb: 2 }}>
                <Typography fontSize="large" sx={{ mt: 2, mb: 1 }}>
                    Send a test message
                </Typography>
                {isConfigured ? (
                    <Box>
                        <Typography variant="body2" color="text.secondary" mb={2}>
                            Send one WhatsApp message to check the setup. Use the international format (country code
                            included), e.g. <code>+33612345678</code>.
                        </Typography>
                        <TextField
                            margin="normal"
                            fullWidth
                            label="Recipient phone number"
                            value={to}
                            onChange={(e) => setTo(e.target.value)}
                            placeholder="+33612345678"
                        />
                        <TextField
                            margin="normal"
                            fullWidth
                            multiline
                            minRows={2}
                            label="Message"
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                        />
                        <Grid item xs={12}>
                            <LoadingButton
                                onClick={sendTest}
                                disabled={sending || to.trim().length === 0 || message.trim().length === 0}
                                loading={sending}
                                variant="contained"
                                sx={{ mt: 2, mb: 2 }}>
                                Send test message
                            </LoadingButton>
                        </Grid>
                    </Box>
                ) : (
                    <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                        Save your GreenAPI instance id and token above to unlock sending.
                    </Typography>
                )}
            </Card>
        </Container>
    )
}
