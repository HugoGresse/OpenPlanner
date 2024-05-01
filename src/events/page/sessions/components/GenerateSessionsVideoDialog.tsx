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
import { ShortVidSettings } from './ShortVidSettings'
import { useNotification } from '../../../../hooks/notificationHook'

export const GenerateSessionsVideoDialog = ({
    isOpen,
    onClose,
    event,
    sessions,
    onSuccess,
    forceGenerate = false,
}: {
    isOpen: boolean
    onClose: () => void
    event: Event
    sessions: Session[]
    onSuccess?: ({}: { videoUrl: string; imageUrl: string }) => void
    forceGenerate?: boolean
}) => {
    const { createNotification } = useNotification()
    const { generatingState, generate } = useSessionsGenerationGeneric<
        ShortVidGenerationSettings,
        GeneratedSessionVideoAnswer
    >(event, generateShortVid)
    const finalGeneration = useSessionsGenerationGeneric<ShortVidGenerationSettings, GeneratedSessionVideoAnswer>(
        event,
        generateShortVid
    )

    const shortVidSetting = {
        template: event.shortVidSettings?.template || 'TalkBranded',
        eventId: event.id,
        eventApiKey: event.apiKey,
        locationName: event.locationName || '',
        logoUrl: event.logoUrl || '',
        colorBackground: event.colorBackground || '',
        eventStartDate: event.dates.start,
    }

    const disabledButton =
        generatingState.generationState === GenerationStates.GENERATING ||
        finalGeneration.generatingState.generationState === GenerationStates.GENERATING

    const sessionToGenerateFor = forceGenerate
        ? sessions
        : sessions.filter((session) => session.speakers && session.speakers.length > 0)

    const generateAllVideos = () => {
        const updateDoc = !onSuccess
        finalGeneration
            .generate(sessionToGenerateFor, updateDoc, {
                ...shortVidSetting,
                updateSession: updateDoc,
            })
            .then(({ success, results }: GeneratedSessionVideoAnswer) => {
                if (onSuccess && success && results.length) {
                    onSuccess(results[0])
                }
                onClose()
                const text = onSuccess ? 'Video generation done!' : 'Video generation done, sessions updated!'
                createNotification(text, { type: 'success' })
            })
    }

    const generateAllText = `Generate ${sessionToGenerateFor.length} videos/images (${convertSecondsToMinutes(
        sessionToGenerateFor.length * 20
    )} minutes) using ShortVid.io${!onSuccess ? ', and save them to the sessions' : ''}`

    return (
        <Dialog open={isOpen} onClose={onClose} maxWidth="lg" fullWidth={true} scroll="body">
            <DialogContent sx={{ minHeight: '80vh' }}>
                <Typography variant="h5">Generate session(s) announcement videos</Typography>
                <Typography>
                    This will do generate a video (and an image) for each session using shortvid.io. Only sessions with
                    speakers will be generated. The template only apply for one or two speakers and will not render
                    correctly for 3 or more.
                    <br />
                    ⚠️ Please fill the event details & theme info in the settings page before generating the videos. ⚠️
                    Please don't spam this service, as video generation is compute heavy and is not free.
                    <br />
                    <a href="https://github.com/lyonjs/shortvid.io">More info</a>
                    <br />
                </Typography>

                <ShortVidSettings event={event} />

                {!forceGenerate && (
                    <Button
                        variant="contained"
                        disabled={disabledButton}
                        onClick={() =>
                            generate(sessionToGenerateFor.slice(0, 1), false, {
                                ...shortVidSetting,
                                updateSession: false,
                            })
                        }>
                        {generatingState.generationState === 'GENERATING' ? (
                            <>
                                Generating...
                                <CircularProgress />
                            </>
                        ) : (
                            'Preview (~20s)'
                        )}
                        {generatingState.progress && ` (${generatingState.progress})`}
                    </Button>
                )}
                <Button
                    variant={forceGenerate ? 'contained' : 'outlined'}
                    disabled={disabledButton}
                    onClick={generateAllVideos}
                    sx={{ marginLeft: 1 }}>
                    {finalGeneration.generatingState.generationState === 'GENERATING' ? (
                        <>
                            Generating...
                            <CircularProgress />
                        </>
                    ) : (
                        generateAllText
                    )}
                    {finalGeneration.generatingState.progress && ` (${finalGeneration.generatingState.progress})`}
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
                                            <video
                                                src={result.videoUrl}
                                                controls
                                                width="100%"
                                                style={{ maxWidth: '400px', marginRight: 14 }}
                                            />
                                            <img src={result.imageUrl} width="100%" style={{ maxWidth: '400px' }} />
                                        </Box>
                                    )
                                })}
                        </Box>

                        <Button
                            variant="outlined"
                            disabled={finalGeneration.generatingState.generationState === GenerationStates.GENERATING}
                            onClick={generateAllVideos}>
                            {finalGeneration.generatingState.generationState === 'GENERATING' ? (
                                <>
                                    Generating...
                                    <CircularProgress />
                                </>
                            ) : (
                                generateAllText
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
