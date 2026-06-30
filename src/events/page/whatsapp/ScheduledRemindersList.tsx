import { useCallback, useEffect, useState } from 'react'
import { Box, IconButton, List, ListItem, ListItemText, Typography } from '@mui/material'
import { Delete as DeleteIcon } from '@mui/icons-material'
import { Event } from '../../../types'
import { fetchOpenPlannerApi } from '../../../services/hooks/useOpenPlannerApi'
import { useNotification } from '../../../hooks/notificationHook'

type ScheduledTask = { name: string; scheduleTime: string | null; message: string }

export type ScheduledRemindersListProps = {
    event: Event
    // Bump to force a refresh (e.g. when a reminder fires and the list should shrink).
    refreshSignal?: number
}

// Lists the still-pending reminder tasks (Cloud Tasks) for the event and lets the operator cancel any.
export const ScheduledRemindersList = ({ event, refreshSignal }: ScheduledRemindersListProps) => {
    const { createNotification } = useNotification()
    const [tasks, setTasks] = useState<ScheduledTask[]>([])
    const [deleting, setDeleting] = useState<string | null>(null)

    const refresh = useCallback(async () => {
        try {
            const res = await fetchOpenPlannerApi<{ tasks: ScheduledTask[] }>(event, 'whatsapp/scheduled-tasks', {
                method: 'GET',
            })
            setTasks(res.tasks || [])
        } catch {
            // best-effort listing
        }
    }, [event])

    useEffect(() => {
        refresh()
    }, [refresh, refreshSignal])

    const remove = async (name: string) => {
        setDeleting(name)
        try {
            await fetchOpenPlannerApi(event, 'whatsapp/scheduled-tasks', { method: 'DELETE', body: { name } })
            createNotification('Reminder cancelled', { type: 'success' })
            await refresh()
        } catch (error) {
            createNotification('Failed to cancel: ' + (error instanceof Error ? error.message : 'Unknown error'), {
                type: 'error',
            })
        } finally {
            setDeleting(null)
        }
    }

    if (tasks.length === 0) return null

    return (
        <Box mt={2}>
            <Typography variant="subtitle2" gutterBottom>
                Scheduled reminders
            </Typography>
            <List dense disablePadding>
                {tasks.map((task) => (
                    <ListItem
                        key={task.name}
                        secondaryAction={
                            <IconButton
                                edge="end"
                                aria-label="cancel reminder"
                                disabled={deleting === task.name}
                                onClick={() => remove(task.name)}>
                                <DeleteIcon />
                            </IconButton>
                        }>
                        <ListItemText
                            primary={task.message}
                            secondary={task.scheduleTime ? new Date(task.scheduleTime).toLocaleString() : 'pending'}
                        />
                    </ListItem>
                ))}
            </List>
        </Box>
    )
}
