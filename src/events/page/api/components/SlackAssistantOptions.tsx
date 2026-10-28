import { Box, Typography } from '@mui/material'
import { CheckboxElement } from 'react-hook-form-mui'

export type SlackAssistantOptionsProps = {
    isSubmitting: boolean
}

// Behaviour toggles for the Slack assistant. Lives inside the EventSlack form, which owns the Save button.
export const SlackAssistantOptions = ({ isSubmitting }: SlackAssistantOptionsProps) => (
    <Box mt={3}>
        <Typography fontWeight="600">Assistant behaviour</Typography>
        <CheckboxElement
            name="slackAnswerAnyQuestion"
            label="Answer any question, even unrelated to OpenPlanner or this event"
            disabled={isSubmitting}
        />
        <Typography variant="body2" color="text.secondary">
            Off (default): the assistant stays focused on this event and may decline unrelated questions. On: it also
            acts as a general assistant. Anyone who can message the bot in your Slack workspace then uses your
            OpenRouter key for any topic, so expect higher usage. Either way the scope is an instruction to the model,
            not a hard block.
        </Typography>
    </Box>
)
