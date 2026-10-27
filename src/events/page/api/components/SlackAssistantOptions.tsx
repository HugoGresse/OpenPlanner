import { Box, Typography } from '@mui/material'
import LoadingButton from '@mui/lab/LoadingButton'
import { CheckboxElement } from 'react-hook-form-mui'

export type SlackAssistantOptionsProps = {
    isSubmitting: boolean
}

// Behaviour toggles for the Slack assistant. Lives inside the EventSlack form.
export const SlackAssistantOptions = ({ isSubmitting }: SlackAssistantOptionsProps) => (
    <Box mt={3}>
        <Typography fontWeight="600">Assistant behaviour</Typography>
        <CheckboxElement
            name="slackAnswerAnyQuestion"
            label="Answer any question, even unrelated to OpenPlanner or this event"
            disabled={isSubmitting}
        />
        <Typography variant="body2" color="text.secondary">
            Off: the bot only helps with this event and politely declines other topics. On: it also acts as a general
            assistant (same model and OpenRouter key).
        </Typography>
        <LoadingButton
            type="submit"
            disabled={isSubmitting}
            loading={isSubmitting}
            variant="contained"
            size="small"
            sx={{ mt: 1 }}>
            Save
        </LoadingButton>
    </Box>
)
