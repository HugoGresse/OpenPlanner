import * as React from 'react'
import { useEffect, useState } from 'react'
import {
    Box,
    Button,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    Stack,
    TextField,
    Typography,
} from '@mui/material'
import { Event, Speaker } from '../../../../types'
import { fetchOpenPlannerApi } from '../../../../services/hooks/useOpenPlannerApi'
import { useNotification } from '../../../../hooks/notificationHook'

type PendingEdit = {
    id: string
    speakerId: string
    submittedAt?: { _seconds?: number; seconds?: number } | string
    status: 'pending' | 'approved' | 'rejected'
    patch: Partial<Speaker>
    baseSnapshot: Partial<Speaker>
    reviewedBy?: string | null
    reviewedAt?: { _seconds?: number; seconds?: number } | string | null
    reviewNote?: string | null
}

export type PendingEditsDialogProps = {
    event: Event
    isOpen: boolean
    onClose: () => void
}

const renderValue = (v: unknown) => {
    if (v === null || v === undefined || v === '') return <em>(empty)</em>
    if (typeof v === 'boolean') return v ? 'true' : 'false'
    if (Array.isArray(v)) return <pre style={{ margin: 0 }}>{JSON.stringify(v, null, 2)}</pre>
    if (typeof v === 'object') return <pre style={{ margin: 0 }}>{JSON.stringify(v, null, 2)}</pre>
    return String(v)
}

const DiffView = ({ before, after }: { before: Partial<Speaker>; after: Partial<Speaker> }) => {
    const keys = Array.from(new Set([...Object.keys(before), ...Object.keys(after)]))
    return (
        <Box>
            {keys.map((k) => (
                <Box key={k} mb={2}>
                    <Typography variant="subtitle2">{k}</Typography>
                    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                        <Box flex={1} sx={{ p: 1, bgcolor: 'action.hover', borderRadius: 1 }}>
                            <Typography variant="caption" color="text.secondary">
                                Before
                            </Typography>
                            <Box>{renderValue((before as Record<string, unknown>)[k])}</Box>
                        </Box>
                        <Box flex={1} sx={{ p: 1, bgcolor: 'success.50', borderRadius: 1 }}>
                            <Typography variant="caption" color="text.secondary">
                                After
                            </Typography>
                            <Box>{renderValue((after as Record<string, unknown>)[k])}</Box>
                        </Box>
                    </Stack>
                </Box>
            ))}
        </Box>
    )
}

export const PendingEditsDialog = ({ event, isOpen, onClose }: PendingEditsDialogProps) => {
    const { createNotification } = useNotification()
    const [items, setItems] = useState<PendingEdit[]>([])
    const [loading, setLoading] = useState(false)
    const [selected, setSelected] = useState<PendingEdit | null>(null)
    const [rejectNote, setRejectNote] = useState('')
    const [processing, setProcessing] = useState(false)

    const load = async () => {
        setLoading(true)
        try {
            const data = await fetchOpenPlannerApi<{ items: PendingEdit[] }>(event, 'speaker-pending-edits', {
                method: 'GET',
                query: { status: 'pending' },
            })
            setItems(data.items || [])
        } catch (err) {
            console.error(err)
            createNotification('Failed to load pending edits', { type: 'error' })
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (isOpen) {
            load()
        }
    }, [isOpen])

    const handleApprove = async () => {
        if (!selected) return
        setProcessing(true)
        try {
            await fetchOpenPlannerApi(event, `speaker-pending-edits/${selected.id}/approve`, {
                method: 'POST',
                body: {},
            })
            createNotification('Approved & applied', { type: 'success' })
            setSelected(null)
            await load()
        } catch (err) {
            console.error(err)
            createNotification('Approval failed', { type: 'error' })
        } finally {
            setProcessing(false)
        }
    }

    const handleReject = async () => {
        if (!selected) return
        setProcessing(true)
        try {
            await fetchOpenPlannerApi(event, `speaker-pending-edits/${selected.id}/reject`, {
                method: 'POST',
                body: { reviewNote: rejectNote || undefined },
            })
            createNotification('Rejected', { type: 'success' })
            setSelected(null)
            setRejectNote('')
            await load()
        } catch (err) {
            console.error(err)
            createNotification('Rejection failed', { type: 'error' })
        } finally {
            setProcessing(false)
        }
    }

    return (
        <Dialog open={isOpen} onClose={onClose} maxWidth="lg" fullWidth>
            <DialogTitle>Pending speaker edits</DialogTitle>
            <DialogContent>
                {loading && <Typography>Loading…</Typography>}
                {!loading && items.length === 0 && <Typography color="text.secondary">No pending edits.</Typography>}
                {!selected &&
                    items.map((item) => (
                        <Box
                            key={item.id}
                            sx={{
                                p: 2,
                                mb: 1,
                                border: '1px solid',
                                borderColor: 'divider',
                                borderRadius: 1,
                                cursor: 'pointer',
                            }}
                            onClick={() => setSelected(item)}>
                            <Stack direction="row" spacing={2} alignItems="center">
                                <Typography fontWeight={600}>{item.speakerId}</Typography>
                                <Chip label={item.status} size="small" />
                                <Typography variant="body2" color="text.secondary">
                                    {Object.keys(item.patch).join(', ')}
                                </Typography>
                            </Stack>
                        </Box>
                    ))}
                {selected && (
                    <Box>
                        <Stack direction="row" spacing={2} alignItems="center" mb={2}>
                            <Button onClick={() => setSelected(null)}>← Back to list</Button>
                            <Typography fontWeight={600}>Speaker: {selected.speakerId}</Typography>
                        </Stack>
                        <Divider sx={{ mb: 2 }} />
                        <DiffView before={selected.baseSnapshot} after={selected.patch} />
                        <Box mt={3}>
                            <TextField
                                fullWidth
                                size="small"
                                multiline
                                label="Rejection note (optional)"
                                value={rejectNote}
                                onChange={(e) => setRejectNote(e.target.value)}
                            />
                        </Box>
                    </Box>
                )}
            </DialogContent>
            <DialogActions>
                {selected ? (
                    <>
                        <Button color="error" onClick={handleReject} disabled={processing}>
                            Reject
                        </Button>
                        <Button variant="contained" color="success" onClick={handleApprove} disabled={processing}>
                            Approve & apply
                        </Button>
                    </>
                ) : (
                    <Button onClick={onClose}>Close</Button>
                )}
            </DialogActions>
        </Dialog>
    )
}
