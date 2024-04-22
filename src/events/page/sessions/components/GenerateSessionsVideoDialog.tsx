import { Event, Session } from '../../../../types'
import { Box, Button, CircularProgress, Dialog, DialogContent, Typography } from '@mui/material'
import * as React from 'react'
import { convertSecondsToMinutes } from '../../../../utils/dates/convertSecondsToMinutes'
import {
    GenerationStates,
    useSessionsGenerationGeneric,
} from '../../../actions/sessions/generation/useSessionsGenerationGeneric'
import {
    GeneratedSessionVideoAnswer,
    generateShortVid,
    ShortVidGenerationSettings,
} from '../../../actions/sessions/generation/generateShortVid'

export const GenerateSessionsVideoDialog = ({
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
    const { generatingState, generate } = useSessionsGenerationGeneric<
        ShortVidGenerationSettings,
        GeneratedSessionVideoAnswer
    >(event, generateShortVid)
    const finalGeneration = useSessionsGenerationGeneric<ShortVidGenerationSettings, GeneratedSessionVideoAnswer>(
        event,
        generateShortVid
    )

    const shortVidSetting = {
        template: 'TalkBranded',
        eventId: event.id,
        updateSession: true,
        eventApiKey: event.apiKey,
    }

    console.log(sessions)

    return (
        <Dialog open={isOpen} onClose={onClose} maxWidth="lg" fullWidth={true} scroll="body">
            <DialogContent sx={{ minHeight: '80vh' }}>
                <Typography variant="h5">Generate announcement videos for each session</Typography>
                <Typography>
                    This will do generate a video for each session using shortvid.io
                    <br />
                    ⚠️ Please don't spam this service, as video generation is compute heavy and is not free.
                    <br />
                    <a href="https://github.com/lyonjs/shortvid.io">More info</a>
                    <br />
                </Typography>

                <Button
                    variant="outlined"
                    disabled={generatingState.generationState === GenerationStates.GENERATING}
                    onClick={() => generate(sessions.slice(0, 1), false, shortVidSetting)}>
                    {generatingState.generationState === 'GENERATING' ? (
                        <>
                            Generating...
                            <CircularProgress />
                        </>
                    ) : (
                        'Generate 1 session video using ShortVid.io (~20s)'
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
                                generatingState.results.results.map((result, index) => {
                                    return (
                                        <Box key={index}>
                                            <video src={result.videoUrl} controls width="100%" />
                                        </Box>
                                    )
                                })}
                        </Box>

                        <Button
                            variant="contained"
                            disabled={finalGeneration.generatingState.generationState === GenerationStates.GENERATING}
                            onClick={() => finalGeneration.generate(sessions, true, shortVidSetting)}>
                            {finalGeneration.generatingState.generationState === 'GENERATING' ? (
                                <>
                                    Generating...
                                    <CircularProgress />
                                </>
                            ) : (
                                `Generate all videos (${convertSecondsToMinutes(
                                    sessions.length * 20
                                )} minutes) using ShortVid.io`
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
