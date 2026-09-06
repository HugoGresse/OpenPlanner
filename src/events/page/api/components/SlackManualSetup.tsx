import { Typography } from '@mui/material'
import LoadingButton from '@mui/lab/LoadingButton'
import { Event } from '../../../../types'
import { FUNCTION_API_URL } from '../../../../env'
import { TextFieldElementPrivate } from '../../../../components/form/TextFieldElementPrivate'
import { TypographyCopyable } from '../../../../components/TypographyCopyable'

const apiBase = String(FUNCTION_API_URL ?? '').replace(/\/+$/, '')

export const buildSlackAppManifest = (eventsUrl: string, interactionsUrl: string) => ({
    display_information: { name: 'OpenPlanner', description: 'OpenPlanner event assistant' },
    features: {
        bot_user: { display_name: 'OpenPlanner', always_online: true },
        app_home: { messages_tab_enabled: true, messages_tab_read_only_enabled: false },
    },
    oauth_config: {
        scopes: {
            bot: [
                'app_mentions:read',
                'chat:write',
                'channels:history',
                'groups:history',
                'im:history',
                'mpim:history',
            ],
        },
    },
    settings: {
        event_subscriptions: { request_url: eventsUrl, bot_events: ['app_mention', 'message.im'] },
        interactivity: { is_enabled: true, request_url: interactionsUrl },
        org_deploy_enabled: false,
        socket_mode_enabled: false,
        token_rotation_enabled: false,
    },
})

export type SlackManualSetupProps = {
    event: Event
    isSubmitting: boolean
}

// Self-managed Slack app: the user creates their own app from the manifest and pastes its credentials.
export const SlackManualSetup = ({ event, isSubmitting }: SlackManualSetupProps) => {
    const eventsUrl = `${apiBase}/v1/${event.id}/slack/events`
    const interactionsUrl = `${apiBase}/v1/${event.id}/slack/interactions`
    const manifest = JSON.stringify(buildSlackAppManifest(eventsUrl, interactionsUrl), null, 2)

    return (
        <>
            <Typography fontWeight="600">1. Create the Slack app</Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
                Go to{' '}
                <a href="https://api.slack.com/apps?new_app=1" target="_blank" rel="noreferrer">
                    api.slack.com/apps
                </a>
                , choose <strong>From a manifest</strong>, paste the manifest below, then install the app to your
                workspace.
            </Typography>
            <TypographyCopyable sx={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: 11 }}>
                {manifest}
            </TypographyCopyable>

            <Typography fontWeight="600" mt={3}>
                2. Paste the credentials
            </Typography>
            <Typography variant="body2" color="text.secondary">
                Bot token from <strong>OAuth & Permissions</strong> (starts with xoxb-), signing secret from{' '}
                <strong>Basic Information</strong>. Save before Slack verifies the request URLs: verification is signed
                with the secret.
            </Typography>
            <TextFieldElementPrivate
                margin="normal"
                fullWidth
                id="slackBotToken"
                label="Slack bot token"
                name="slackBotToken"
                disabled={isSubmitting}
            />
            <TextFieldElementPrivate
                margin="normal"
                fullWidth
                id="slackSigningSecret"
                label="Slack signing secret"
                name="slackSigningSecret"
                disabled={isSubmitting}
            />
            <LoadingButton
                type="submit"
                disabled={isSubmitting}
                loading={isSubmitting}
                fullWidth
                variant="contained"
                sx={{ mt: 1, mb: 2 }}>
                Save
            </LoadingButton>

            <Typography fontWeight="600" mt={1}>
                3. Request URLs (already in the manifest)
            </Typography>
            <Typography variant="body2" gutterBottom>
                Event Subscriptions:
            </Typography>
            <TypographyCopyable singleLine={true}>{eventsUrl}</TypographyCopyable>
            <Typography variant="body2" gutterBottom mt={1}>
                Interactivity:
            </Typography>
            <TypographyCopyable singleLine={true}>{interactionsUrl}</TypographyCopyable>
        </>
    )
}
