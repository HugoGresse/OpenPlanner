import { useEffect } from 'react'
import * as yup from 'yup'
import { doc } from 'firebase/firestore'
import { FormContainer, TextFieldElement, useForm } from 'react-hook-form-mui'
import { Controller } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import {
    Alert,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    TextField,
    Typography,
} from '@mui/material'
import LoadingButton from '@mui/lab/LoadingButton'
import { Event, EventSettingForForm } from '../../../types'
import { collections } from '../../../services/firebase'
import { useFirestoreDocumentMutation } from '../../../services/hooks/firestoreMutationHooks'
import { mapEventDevSettingsFormToMutateObject } from '../settings/mapEventSettingsFormToMutateObject'
import { TextFieldElementPrivate } from '../../../components/form/TextFieldElementPrivate'
import { SaveShortcut } from '../../../components/form/SaveShortcut'
import { useNotification } from '../../../hooks/notificationHook'
import { WhatsAppWebhookSetup } from './WhatsAppWebhookSetup'
import { WhatsAppTestMessage } from './WhatsAppTestMessage'
import { WhatsAppChatPicker } from './WhatsAppChatPicker'

const schema = yup
    .object({
        greenApiInstanceId: yup.string().nullable(),
        greenApiToken: yup.string().nullable(),
        whatsappSharedChatId: yup.string().nullable(),
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
    whatsappSharedChatId: event.whatsappSharedChatId || '',
})

export type WhatsAppConfigModalProps = {
    open: boolean
    onClose: () => void
    event: Event
}

// Single place to set up everything WhatsApp needs: GreenAPI credentials, the shared chat, the webhook
// and a test message. Auto-opened on first setup from the WhatsApp page.
export const WhatsAppConfigModal = ({ open, onClose, event }: WhatsAppConfigModalProps) => {
    const mutation = useFirestoreDocumentMutation(doc(collections.events, event.id))
    const { createNotification } = useNotification()

    const formContext = useForm({ defaultValues: convertInputEvent(event) })
    const { formState, reset } = formContext

    useEffect(() => {
        reset(convertInputEvent(event))
    }, [event])

    const isConfigured = Boolean(event.greenApiInstanceId && event.greenApiToken)

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth scroll="body">
            <DialogTitle>WhatsApp configuration</DialogTitle>
            <DialogContent>
                <Alert severity="info" sx={{ mb: 2 }}>
                    Messages are sent through{' '}
                    <a href="https://green-api.com" target="_blank" rel="noreferrer">
                        GreenAPI
                    </a>
                    . The free <strong>Developer</strong> plan is enough for track management. Create an instance, then
                    paste its credentials below.
                </Alert>

                <FormContainer
                    formContext={formContext}
                    // @ts-ignore
                    resolver={yupResolver(schema)}
                    onSuccess={async (data) => {
                        await mutation.mutate(mapEventDevSettingsFormToMutateObject(event, data))
                        createNotification('WhatsApp configuration saved', { type: 'success' })
                    }}>
                    <Typography fontSize="large" sx={{ mb: 1 }}>
                        1. GreenAPI credentials
                    </Typography>
                    <Typography variant="body2" color="text.secondary" mb={1}>
                        The token never leaves the backend — messages are sent server-side.
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

                    <Typography fontSize="large" sx={{ mt: 3, mb: 1 }}>
                        2. Shared chat
                    </Typography>
                    <Controller
                        name="whatsappSharedChatId"
                        control={formContext.control}
                        render={({ field }) =>
                            isConfigured ? (
                                <WhatsAppChatPicker
                                    event={event}
                                    value={field.value || ''}
                                    onChange={field.onChange}
                                    filterType="group"
                                    label="Shared chat group"
                                    helperText="Pick the WhatsApp group that receives the track poll. You can also type a chatId / phone manually."
                                />
                            ) : (
                                <TextField
                                    margin="normal"
                                    fullWidth
                                    label="Shared chat (chatId ending with @c.us or @g.us)"
                                    value={field.value || ''}
                                    onChange={(e) => field.onChange(e.target.value)}
                                    placeholder="120363xxxxxxxxxx@g.us"
                                    helperText="Save your GreenAPI credentials first to pick from your groups."
                                />
                            )
                        }
                    />

                    <LoadingButton
                        type="submit"
                        disabled={formState.isSubmitting}
                        loading={formState.isSubmitting}
                        fullWidth
                        variant="contained"
                        sx={{ mt: 2 }}>
                        Save configuration
                    </LoadingButton>
                    <SaveShortcut />
                </FormContainer>

                <Divider sx={{ my: 3 }} />

                <Typography fontSize="large" sx={{ mb: 1 }}>
                    3. Webhook (required to receive poll votes)
                </Typography>
                <WhatsAppWebhookSetup event={event} />

                <Divider sx={{ my: 3 }} />

                <Typography fontSize="large" sx={{ mb: 1 }}>
                    4. Send a test message
                </Typography>
                {isConfigured ? (
                    <WhatsAppTestMessage event={event} />
                ) : (
                    <Typography variant="body2" color="text.secondary" sx={{ pb: 2 }}>
                        Save your GreenAPI instance id and token above to unlock sending.
                    </Typography>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Close</Button>
            </DialogActions>
        </Dialog>
    )
}
