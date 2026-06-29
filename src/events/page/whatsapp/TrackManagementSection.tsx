import { Alert, Card, Typography } from '@mui/material'
import { Event } from '../../../types'
import { TrackPollPanel } from './TrackPollPanel'

export const TrackManagementSection = ({ event }: { event: Event }) => {
    // The shared chat is set in the configuration modal; the poll is sent to it.
    const chatId = event.whatsappSharedChatId || ''

    return (
        <Card sx={{ paddingX: 2, mt: 2, mb: 2 }}>
            <Typography fontSize="large" sx={{ mt: 2, mb: 1 }}>
                Track management
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={2}>
                Send a WhatsApp poll listing the tracks (up to 12 options per poll). When a track manager taps their
                track in the poll it is marked ready; once every track is ready, you can send the GO message to the same
                chat. Sending GO also auto-schedules the 15/10/5 min and end-of-session reminders on a 50min clock — use
                the buttons below to send any of them manually if timing needs to change.
            </Typography>

            {chatId ? (
                <Typography variant="body2" color="text.secondary" mb={2}>
                    Shared chat: <code>{chatId}</code>
                </Typography>
            ) : (
                <Alert severity="warning" sx={{ mb: 2 }}>
                    No shared chat set — open the configuration to set the chatId before sending a poll.
                </Alert>
            )}

            <TrackPollPanel event={event} chatId={chatId} />
        </Card>
    )
}
