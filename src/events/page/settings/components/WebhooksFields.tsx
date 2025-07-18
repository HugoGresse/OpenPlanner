import { useState } from 'react'
import {
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    IconButton,
    Typography,
} from '@mui/material'
import { Control, TextFieldElement, useFieldArray } from 'react-hook-form-mui'
import { Add, Delete } from '@mui/icons-material'
import { Event, EventSettingForForm, Webhooks } from '../../../../types'
import { DateTime } from 'luxon'
export type WebhooksFieldsProps = {
    control: Control<EventSettingForForm, any>
    isSubmitting: boolean
    event: Event
}
type WebhooksWithKey = Webhooks & { id: string }

export const WebhooksFields = ({ control, isSubmitting, event }: WebhooksFieldsProps) => {
    const [selectedWebhook, setSelectedWebhook] = useState<null | Webhooks>(null)
    const { fields, append, remove } = useFieldArray({
        control,
        name: 'webhooks',
    })

    return (
        <>
            <Typography fontWeight="600" mt={2}>
                Webhooks
            </Typography>

            <Box>
                {fields.map((webhook: WebhooksWithKey, index) => {
                    const eventWebhook = event.webhooks.find((w) => w.url === webhook.url)
                    const lastAnswerRelativeToNow = eventWebhook?.lastAnswerDate
                        ? DateTime.fromJSDate(eventWebhook.lastAnswerDate.toDate()).toRelative()
                        : 'never'

                    return (
                        <Box display="flex" flexDirection="column" key={webhook.id}>
                            <Box display="flex">
                                <TextFieldElement
                                    id={webhook.id}
                                    label="Endpoint (url)"
                                    name={`webhooks.${index}.url`}
                                    control={control}
                                    variant="filled"
                                    size="small"
                                    margin="dense"
                                    fullWidth
                                    disabled={isSubmitting}
                                />
                                <TextFieldElement
                                    id={webhook.id}
                                    label="Token (optional)"
                                    name={`webhooks.${index}.token`}
                                    control={control}
                                    variant="filled"
                                    size="small"
                                    margin="dense"
                                    type="password"
                                    fullWidth
                                    disabled={isSubmitting}
                                />

                                <IconButton
                                    aria-label="Remove webhook"
                                    onClick={() => {
                                        remove(index)
                                    }}
                                    edge="end">
                                    <Delete />
                                </IconButton>
                            </Box>
                            <Button
                                onClick={() => {
                                    setSelectedWebhook(eventWebhook || null)
                                }}
                                size="small">
                                Last answer:{' '}
                                {eventWebhook && eventWebhook.lastAnswer
                                    ? `${lastAnswerRelativeToNow}, ${eventWebhook.lastAnswer.slice(0, 15)}...`
                                    : 'none'}
                            </Button>
                        </Box>
                    )
                })}
                <IconButton
                    aria-label="Add webhook"
                    onClick={() => {
                        append({
                            url: '',
                            token: null,
                            lastAnswer: null,
                            lastAnswerDate: null,
                        })
                    }}>
                    <Add />
                </IconButton>
            </Box>

            <Dialog open={!!selectedWebhook} onClose={() => setSelectedWebhook(null)}>
                <DialogTitle>Webhook last answer</DialogTitle>
                <DialogContent>
                    <DialogContentText>Url: {selectedWebhook?.url}</DialogContentText>
                    <pre>{JSON.stringify(selectedWebhook?.lastAnswer, null, 4)}</pre>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setSelectedWebhook(null)}>Close</Button>
                </DialogActions>
            </Dialog>
        </>
    )
}
