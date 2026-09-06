import { useState } from 'react'
import { Box, Card, Collapse, IconButton, Link, Typography } from '@mui/material'
import { ExpandMore as ExpandMoreIcon } from '@mui/icons-material'
import { Event } from '../../../../types'
import { useSlackConfig } from '../../../../services/hooks/useSlackConfig'
import { SlackOfficialConnect } from './SlackOfficialConnect'
import { SlackManualSetup } from './SlackManualSetup'

export type SlackChatSectionProps = {
    event: Event
    isSubmitting: boolean
}

export const SlackChatSection = ({ event, isSubmitting }: SlackChatSectionProps) => {
    const [expanded, setExpanded] = useState(true)
    const { config, isLoading } = useSlackConfig()
    const officialApp = config?.officialApp === true
    const manualConfigured = Boolean(event.slackBotToken && event.slackSigningSecret)
    const [showManual, setShowManual] = useState(manualConfigured)
    const status = event.slackTeamId || manualConfigured ? ' Connected.' : ' Not connected yet.'

    return (
        <Card sx={{ paddingX: 2, mt: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 2 }}>
                <Box>
                    <Typography fontSize="large" sx={{ mt: 2 }}>
                        Slack chat assistant
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Mention the bot in Slack to use the same assistant as the in-app chat: ask about sessions and
                        speakers, and approve edits with Apply / Reject buttons.
                        {status}
                    </Typography>
                </Box>
                <IconButton
                    size="small"
                    onClick={() => setExpanded(!expanded)}
                    sx={{ transform: expanded ? 'rotate(0deg)' : 'rotate(-90deg)', transition: '0.3s' }}>
                    <ExpandMoreIcon />
                </IconButton>
            </Box>
            <Collapse in={expanded}>
                {isLoading ? (
                    <Typography variant="body2" color="text.secondary" mb={2}>
                        Loading…
                    </Typography>
                ) : officialApp ? (
                    <>
                        <SlackOfficialConnect event={event} />
                        <Typography variant="body2" mt={3}>
                            <Link component="button" type="button" onClick={() => setShowManual(!showManual)}>
                                {showManual ? 'Hide' : 'Advanced: use your own Slack app instead'}
                            </Link>
                        </Typography>
                        <Collapse in={showManual}>
                            <Box mt={2}>
                                <SlackManualSetup event={event} isSubmitting={isSubmitting} />
                            </Box>
                        </Collapse>
                    </>
                ) : (
                    <SlackManualSetup event={event} isSubmitting={isSubmitting} />
                )}
                <Typography variant="body2" color="text.secondary" mt={2} mb={2}>
                    Requires the event OpenRouter key (Event settings). Invite the bot to a channel, then{' '}
                    <code>@OpenPlanner rename speaker Alice to Alicia</code>. Replies land in a thread; each proposed
                    change is a card with Apply / Reject, and every decision is written to the AI audit log.
                </Typography>
            </Collapse>
        </Card>
    )
}
