import { Event, Session } from '../../../../types'
import { Box, Button, CircularProgress, Dialog, DialogContent, Typography } from '@mui/material'
import * as React from 'react'
import { GenerationStates, useSessionsGeneration } from '../../../actions/sessions/generation/useSessionsGeneration'

export const GenerateSessionsMediaContentDialog = ({
    isOpen,
    onClose,
    event,
    sessions,
}: {
    isOpen: boolean
    onClose: () => void
    event: Event
    sessions: Session[]
}) => {
    const { generatingState, generateMediaContent } = useSessionsGeneration(event)
    const finalGeneration = useSessionsGeneration(event)

    return (
        <Dialog open={isOpen} onClose={onClose} maxWidth="lg" fullWidth={true} scroll="body">
            <DialogContent sx={{ minHeight: '80vh' }}>
                <Typography variant="h5">Generate media content for sessions</Typography>
                <Typography>
                    This will do: <br />
                    1. Generate post content using OpenAI ChatGPT3.5-turbo (through OpenRouter.ai)
                    <br />
                    2. Generate a video for each session using the generated post content using shortvid.io
                    <br />
                    ⚠️ Please don't spam this service, as video generation is compute heavy is not provided for free.
                    <br />
                    <a href="https://github.com/lyonjs/shortvid.io">More info</a>
                    <br />
                </Typography>

                {!event.openAPIKey && (
                    <Typography>
                        You need to set up an OpenRouter.ai API key in the event settings to use this feature.
                        <Button href="/settings">Go to event settings</Button>
                    </Typography>
                )}

                <Button
                    variant="outlined"
                    disabled={generatingState.generationState === GenerationStates.GENERATING}
                    onClick={() => generateMediaContent(sessions.slice(0, 1))}>
                    {generatingState.generationState === 'GENERATING' ? (
                        <>
                            Generating...
                            <CircularProgress />
                        </>
                    ) : (
                        'Generate preview (1 session)'
                    )}
                    {generatingState.progress && ` (${generatingState.progress})`}
                </Button>

                {generatingState.generationState === GenerationStates.ERROR && (
                    <Typography color="error">{generatingState.message}</Typography>
                )}
                {generatingState.generationState === GenerationStates.SUCCESS && (
                    <>
                        <Typography color="success">{generatingState.message}</Typography>

                        <Box padding={2} border={1} borderColor="#66666688" borderRadius={4} margin={2}>
                            {generatingState.results &&
                                generatingState.results.map((result, index) => {
                                    return (
                                        <Box key={index}>
                                            <Typography key={index} variant="h6">
                                                - {result.social}
                                            </Typography>
                                            <Typography>{result.result}</Typography>
                                        </Box>
                                    )
                                })}
                        </Box>

                        <Button
                            variant="contained"
                            disabled={finalGeneration.generatingState.generationState === GenerationStates.GENERATING}
                            onClick={() => finalGeneration.generateMediaContent(sessions, true)}>
                            {finalGeneration.generatingState.generationState === 'GENERATING' ? (
                                <>
                                    Generating...
                                    <CircularProgress />
                                </>
                            ) : (
                                'Generate content on all sessions (takes times)'
                            )}
                            {finalGeneration.generatingState.progress &&
                                ` (${finalGeneration.generatingState.progress})`}
                        </Button>
                    </>
                )}
            </DialogContent>
        </Dialog>
    )
}
