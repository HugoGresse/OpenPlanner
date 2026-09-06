import { useEffect, useState } from 'react'
import { Alert, Box, Button, MenuItem, TextField, Typography } from '@mui/material'
import { Event } from '../../../../types'
import { API_URL } from '../../../../env'
import { updateEvent } from '../../../actions/updateEvent'
import { fetchOpenPlannerApi } from '../../../../services/hooks/useOpenPlannerApi'
import { useNotification } from '../../../../hooks/notificationHook'

type SlackChannel = { id: string; name: string; isPrivate: boolean }

const apiBase = String(API_URL ?? '').replace(/\/+$/, '')

export const buildSlackInstallUrl = (event: Event, returnTo: string) =>
    `${apiBase}/v1/${event.id}/slack/install?apiKey=${encodeURIComponent(
        event.apiKey ?? ''
    )}&returnTo=${encodeURIComponent(returnTo)}`

const useSlackReturnNotification = () => {
    const { createNotification } = useNotification()
    useEffect(() => {
        const url = new URL(window.location.href)
        const result = url.searchParams.get('slack')
        if (!result) return
        if (result === 'connected') createNotification('Slack workspace connected', { type: 'success' })
        else
            createNotification(`Slack connection failed: ${url.searchParams.get('reason') ?? 'unknown'}`, {
                type: 'error',
            })
        url.searchParams.delete('slack')
        url.searchParams.delete('reason')
        window.history.replaceState({}, '', url.toString())
    }, [])
}

const useSlackChannels = (event: Event) => {
    const [channels, setChannels] = useState<SlackChannel[] | null>(null)
    const [error, setError] = useState<string | null>(null)
    useEffect(() => {
        if (!event.slackTeamId || !event.apiKey) return
        let cancelled = false
        fetchOpenPlannerApi<{ channels: SlackChannel[] }>(event, 'slack/channels')
            .then((json) => !cancelled && setChannels(json.channels))
            .catch((err) => !cancelled && setError(err instanceof Error ? err.message : 'Failed to load channels'))
        return () => {
            cancelled = true
        }
    }, [event.slackTeamId, event.apiKey])
    return { channels, error }
}

export type SlackOfficialConnectProps = {
    event: Event
}

export const SlackOfficialConnect = ({ event }: SlackOfficialConnectProps) => {
    useSlackReturnNotification()
    const { createNotification } = useNotification()
    const { channels, error } = useSlackChannels(event)
    const [saving, setSaving] = useState(false)

    const selectChannel = async (channelId: string) => {
        const channel = channels?.find((c) => c.id === channelId) ?? null
        setSaving(true)
        try {
            await updateEvent(event.id, {
                slackChannelId: channel?.id ?? null,
                slackChannelName: channel?.name ?? null,
            })
        } finally {
            setSaving(false)
        }
    }

    const disconnect = async () => {
        await updateEvent(event.id, {
            slackTeamId: null,
            slackTeamName: null,
            slackChannelId: null,
            slackChannelName: null,
        })
        createNotification('Slack workspace disconnected from this event', { type: 'success' })
    }

    if (!event.slackTeamId) {
        return (
            <Box>
                <Typography variant="body2" color="text.secondary" mb={2}>
                    One click: install the OpenPlanner app in your Slack workspace, then mention{' '}
                    <code>@OpenPlanner</code> in any channel it is invited to (or DM it).
                </Typography>
                <Button
                    variant="contained"
                    component="a"
                    href={buildSlackInstallUrl(event, window.location.href)}
                    disabled={!event.apiKey}>
                    Add to Slack
                </Button>
                {!event.apiKey && (
                    <Typography variant="body2" color="error" mt={1}>
                        Generate an event API key above first.
                    </Typography>
                )}
            </Box>
        )
    }

    return (
        <Box>
            <Alert severity="success" sx={{ mb: 2 }}>
                Connected to Slack workspace <strong>{event.slackTeamName || event.slackTeamId}</strong>.
            </Alert>
            <Typography variant="body2" color="text.secondary" mb={1}>
                Optional: assign a channel. Needed only when several OpenPlanner events share the same workspace, so
                mentions in that channel reach this event. Invite the bot to the channel first.
            </Typography>
            <TextField
                select
                fullWidth
                size="small"
                label="Channel for this event"
                value={event.slackChannelId ?? ''}
                onChange={(e) => selectChannel(e.target.value)}
                disabled={saving || !channels}
                helperText={error ?? (channels ? undefined : 'Loading channels…')}
                error={Boolean(error)}>
                <MenuItem value="">Any channel (single event in this workspace)</MenuItem>
                {(channels ?? []).map((channel) => (
                    <MenuItem key={channel.id} value={channel.id}>
                        {channel.isPrivate ? '🔒 ' : '#'}
                        {channel.name}
                    </MenuItem>
                ))}
            </TextField>
            <Box mt={2} display="flex" gap={1}>
                <Button
                    variant="outlined"
                    component="a"
                    href={buildSlackInstallUrl(event, window.location.href)}
                    disabled={!event.apiKey}>
                    Reinstall / update permissions
                </Button>
                <Button color="warning" onClick={disconnect}>
                    Disconnect
                </Button>
            </Box>
        </Box>
    )
}
