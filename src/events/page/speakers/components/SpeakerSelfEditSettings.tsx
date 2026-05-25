import * as React from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Box,
    Button,
    Checkbox,
    Chip,
    FormControlLabel,
    IconButton,
    Stack,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material'
import { ContentCopy, ExpandMore } from '@mui/icons-material'
import { Event, SPEAKER_SELF_EDITABLE_FIELDS, SpeakerSelfEditableField } from '../../../../types'
import { updateEvent } from '../../../actions/updateEvent'
import { useNotification } from '../../../../hooks/notificationHook'
import { fetchOpenPlannerApi } from '../../../../services/hooks/useOpenPlannerApi'
import { PendingEditsDialog } from './PendingEditsDialog'

export type SpeakerSelfEditSettingsProps = {
    event: Event
}

const FIELD_LABELS: Record<SpeakerSelfEditableField, string> = {
    name: 'Name',
    pronouns: 'Pronouns',
    jobTitle: 'Job title',
    bio: 'Bio',
    company: 'Company',
    companyLogoUrl: 'Company logo',
    geolocation: 'Geolocation',
    photoUrl: 'Photo',
    socials: 'Socials',
}

export const SpeakerSelfEditSettings = ({ event }: SpeakerSelfEditSettingsProps) => {
    const { createNotification } = useNotification()
    const settings = event.speakerSelfEdit || { enabled: false }
    const [enabled, setEnabled] = useState<boolean>(!!settings.enabled)
    const [selectedFields, setSelectedFields] = useState<SpeakerSelfEditableField[]>(
        (settings.editableFields as SpeakerSelfEditableField[]) || [...SPEAKER_SELF_EDITABLE_FIELDS]
    )
    const [saving, setSaving] = useState(false)
    const [pendingEditsOpen, setPendingEditsOpen] = useState(false)
    const [pendingCount, setPendingCount] = useState<number>(0)

    // The pending-edits queue is only meaningful while the feature is enabled
    // on the saved event (not the unsaved toggle). Read the count from the
    // same API the review dialog uses so this stays in sync with the queue
    // the admin actually approves.
    const refreshPendingCount = useCallback(async () => {
        if (!event.speakerSelfEdit?.enabled || !event.apiKey) {
            setPendingCount(0)
            return
        }
        try {
            const data = await fetchOpenPlannerApi<{ items: unknown[] }>(event, 'speaker-pending-edits', {
                method: 'GET',
                query: { status: 'pending' },
            })
            setPendingCount(Array.isArray(data.items) ? data.items.length : 0)
        } catch (err) {
            console.error('Failed to load pending edits count', err)
        }
    }, [event])

    useEffect(() => {
        refreshPendingCount()
    }, [refreshPendingCount])

    const publicUrl = useMemo(() => {
        return `${window.location.origin}/public/event/${event.id}/speaker-edit`
    }, [event.id])

    const editableCustomFields = (event.speakerCustomFields || []).filter((f) => f.editableBySpeaker)

    const handleSave = async () => {
        setSaving(true)
        try {
            await updateEvent(event.id, {
                speakerSelfEdit: {
                    enabled,
                    editableFields: selectedFields,
                },
            })
            createNotification('Speaker self-edit settings saved', { type: 'success' })
        } catch (err) {
            console.error(err)
            createNotification('Failed to save', { type: 'error' })
        } finally {
            setSaving(false)
        }
    }

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(publicUrl)
            createNotification('Link copied', { type: 'success' })
        } catch {
            createNotification('Failed to copy', { type: 'error' })
        }
    }

    const toggleField = (field: SpeakerSelfEditableField) => {
        setSelectedFields((prev) => (prev.includes(field) ? prev.filter((f) => f !== field) : [...prev, field]))
    }

    // Shared "Pending edits (N)" warning button used both in the collapsed
    // accordion summary and inside the expanded details. The pendingCount
    // is included in the label so admins notice the queue without having
    // to expand the panel. Click handler stops propagation so opening the
    // dialog from the summary does NOT toggle the accordion.
    const renderPendingEditsButton = (placement: 'summary' | 'details') => {
        if (!event.speakerSelfEdit?.enabled) return null
        // Only highlight in warning orange when there is actually a queue
        // to review. Empty queue stays on the default theme colour so the
        // accordion summary does not look perpetually alarmed.
        const hasPending = pendingCount > 0
        return (
            <Button
                variant={hasPending ? 'contained' : 'outlined'}
                color={hasPending ? 'warning' : 'primary'}
                size="small"
                onClick={(e) => {
                    e.stopPropagation()
                    setPendingEditsOpen(true)
                }}
                // The Accordion summary listens for click + focus to toggle
                // expanded state; muting these on the button keeps the
                // accordion stable when the user only wants to open the
                // dialog.
                onFocus={(e) => e.stopPropagation()}
                sx={placement === 'summary' ? { ml: 2 } : { mt: 1 }}>
                Pending edits ({pendingCount})
            </Button>
        )
    }

    return (
        <Accordion sx={{ mb: 2 }}>
            <AccordionSummary expandIcon={<ExpandMore />}>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ width: '100%' }}>
                    <Typography fontWeight={600}>
                        Speaker self-edit{' '}
                        <Chip
                            size="small"
                            color={enabled ? 'success' : 'default'}
                            label={enabled ? 'Enabled' : 'Disabled'}
                            sx={{ ml: 1 }}
                        />
                    </Typography>
                    {renderPendingEditsButton('summary')}
                </Stack>
            </AccordionSummary>
            <AccordionDetails>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Speakers can request a magic link to edit their own profile. Each edit must be approved by an admin
                    before being applied. Max 5 emails per speaker per day.
                </Typography>

                <FormControlLabel
                    control={<Checkbox checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />}
                    label="Enable speaker self-edit"
                />

                {enabled && (
                    <>
                        <Box mt={2}>
                            <Typography variant="subtitle2" mb={1}>
                                Public URL
                            </Typography>
                            <Stack direction="row" spacing={1} alignItems="center">
                                <TextField fullWidth size="small" value={publicUrl} InputProps={{ readOnly: true }} />
                                <Tooltip title="Copy">
                                    <IconButton onClick={handleCopy}>
                                        <ContentCopy />
                                    </IconButton>
                                </Tooltip>
                            </Stack>
                            <Typography variant="caption" color="text.secondary">
                                Share this URL with speakers. They enter their email there.
                            </Typography>
                        </Box>

                        <Box mt={3}>
                            <Typography variant="subtitle2" mb={1}>
                                Editable fields
                            </Typography>
                            <Box display="flex" flexWrap="wrap" gap={1}>
                                {SPEAKER_SELF_EDITABLE_FIELDS.map((field) => (
                                    <FormControlLabel
                                        key={field}
                                        control={
                                            <Checkbox
                                                size="small"
                                                checked={selectedFields.includes(field)}
                                                onChange={() => toggleField(field)}
                                            />
                                        }
                                        label={FIELD_LABELS[field]}
                                    />
                                ))}
                            </Box>
                            {editableCustomFields.length > 0 && (
                                <Box mt={1}>
                                    <Typography variant="caption" color="text.secondary">
                                        Custom fields also editable by speaker:{' '}
                                        {editableCustomFields.map((f) => f.name).join(', ')}
                                    </Typography>
                                </Box>
                            )}
                        </Box>
                    </>
                )}

                {renderPendingEditsButton('details')}

                <Box mt={3}>
                    <Button variant="contained" onClick={handleSave} disabled={saving}>
                        Save settings
                    </Button>
                </Box>
            </AccordionDetails>
            {pendingEditsOpen && (
                <PendingEditsDialog
                    event={event}
                    isOpen={pendingEditsOpen}
                    onClose={() => {
                        setPendingEditsOpen(false)
                        // Refresh the count after the admin reviews — an
                        // approval/rejection inside the dialog drops the
                        // queue length and the button should reflect it.
                        refreshPendingCount()
                    }}
                />
            )}
        </Accordion>
    )
}
