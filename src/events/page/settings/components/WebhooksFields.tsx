import * as React from 'react'
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
import { EventForForm, Webhooks } from '../../../../types'

export type WebhooksFieldsProps = {
    control: Control<EventForForm, any>
    isSubmitting: boolean
}
type WebhooksWithKey = Webhooks & { id: string }
export const WebhooksFields = ({ control, isSubmitting }: WebhooksFieldsProps) => {
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

            <Box paddingLeft={2}>
                {fields.map((webhook: WebhooksWithKey, index) => (
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
                                setSelectedWebhook(webhook)
                            }}
                            size="small">
                            Last answer: {webhook.lastAnswer ? webhook.lastAnswer.slice(0, 15) + '...' : 'none'}
                        </Button>
                    </Box>
                ))}
                <IconButton
                    aria-label="Add webhook"
                    onClick={() => {
                        append({
                            url: '',
                            lastAnswer: null,
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
