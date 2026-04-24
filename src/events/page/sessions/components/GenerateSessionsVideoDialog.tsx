import { Event, Session } from '../../../../types'
import {
    Box,
    Button,
    CircularProgress,
    Dialog,
    DialogContent,
    Typography,
    FormControlLabel,
    Checkbox,
    Alert,
} from '@mui/material'
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
import { ShortVidEndpointDefaultKey } from '../../../actions/sessions/generation/shortVidAPI'
import { checkMediaUrls, MediaCheckResult } from '../../../actions/sessions/generation/checkMediaUrls'

export const GenerateSessionsVideoDialog = ({
    isOpen,
    onClose,
    event,
    sessions,
    onSuccess,
    forceGenerate = false,
    onlyMissing = false,
}: {
    isOpen: boolean
    onClose: () => void
    event: Event
    sessions: Session[]
    onSuccess?: ({}: { videoUrl: string; imageUrl: string }) => void
    forceGenerate?: boolean
    onlyMissing?: boolean
}) => {
    const { createNotification } = useNotification()
    const [onlyMissingChecked, setOnlyMissingChecked] = React.useState(onlyMissing)
    const [mediaCheckResult, setMediaCheckResult] = React.useState<{
        inaccessibleUrls: MediaCheckResult[]
        checked: boolean
        checking: boolean
    }>({ inaccessibleUrls: [], checked: false, checking: false })
    const { generatingState, generate } = useSessionsGenerationGeneric<
        ShortVidGenerationSettings,
        GeneratedSessionVideoAnswer
    >(event, generateShortVid)
    const finalGeneration = useSessionsGenerationGeneric<ShortVidGenerationSettings, GeneratedSessionVideoAnswer>(
        event,
        generateShortVid
    )

    const shortVidSetting: Omit<ShortVidGenerationSettings, 'updateSession'> = {
        template: event.shortVidSettings?.template || 'TalkBranded',
        endpoint: (event.shortVidSettings?.server as any) || ShortVidEndpointDefaultKey,
        eventId: event.id,
        eventApiKey: event.apiKey,
        locationName: event.locationName || '',
        logoUrl: event.logoUrl || '',
        colorBackground: event.colorBackground || '',
        eventStartDate: event.dates.start,
    }

    const disabledButton =
        generatingState.generationState === GenerationStates.GENERATING ||
        finalGeneration.generatingState.generationState === GenerationStates.GENERATING ||
        mediaCheckResult.checking

    const sessionToGenerateFor = React.useMemo(() => {
        let filteredSessions = forceGenerate
            ? sessions
            : sessions.filter((session) => session.speakers && session.speakers.length > 0)

        if (onlyMissingChecked) {
            filteredSessions = filteredSessions.filter((session) => !session.teaserVideoUrl || !session.teaserImageUrl)
        }

        return filteredSessions
    }, [sessions, forceGenerate, onlyMissingChecked])

    const getMediaUrlsToCheck = React.useCallback(() => {
        const urls: string[] = []
        if (shortVidSetting.logoUrl) {
            urls.push(shortVidSetting.logoUrl)
        }
        for (const session of sessionToGenerateFor) {
            for (const speaker of session.speakersData || []) {
                if (speaker.photoUrl) {
                    urls.push(speaker.photoUrl)
                }
            }
        }
        return [...new Set(urls)]
    }, [shortVidSetting.logoUrl, sessionToGenerateFor])

    const runMediaCheck = React.useCallback(async () => {
        const apiKey = shortVidSetting.eventApiKey
        if (!apiKey) {
            setMediaCheckResult({
                inaccessibleUrls: [],
                checked: true,
                checking: false,
            })
            createNotification(
                'No API key available yet. Please generate a video first or set an API key in the event settings.',
                { type: 'warning' }
            )
            return
        }

        setMediaCheckResult({ inaccessibleUrls: [], checked: false, checking: true })
        const urlsToCheck = getMediaUrlsToCheck()
        const result = await checkMediaUrls(shortVidSetting.eventId, apiKey, urlsToCheck)
        setMediaCheckResult({
            inaccessibleUrls: result.inaccessibleUrls,
            checked: true,
            checking: false,
        })
        if (!result.success && result.message) {
            createNotification(result.message, { type: 'error' })
        }
    }, [shortVidSetting.eventId, shortVidSetting.eventApiKey, getMediaUrlsToCheck, createNotification])

    const generateAllVideos = () => {
        const updateDoc = !onSuccess
        finalGeneration
            .generate(sessionToGenerateFor, updateDoc, {
                ...shortVidSetting,
                updateSession: updateDoc,
            })
            .then(({ success, results, message }: GeneratedSessionVideoAnswer) => {
                if (success && results.length) {
                    const text = onSuccess ? 'Video generation done!' : 'Video generation done, sessions updated!'
                    if (onSuccess) {
                        onSuccess(results[0])
                    }
                    createNotification(text, { type: 'success' })
                    onClose()
                } else {
                    createNotification(
                        message || 'Error while generating the video/image, you may want to switch the ShortVid server',
                        { type: 'error' }
                    )
                }
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

                <FormControlLabel
                    sx={{ width: '100%' }}
                    control={
                        <Checkbox
                            checked={onlyMissingChecked}
                            onChange={(e) => setOnlyMissingChecked(e.target.checked)}
                        />
                    }
                    label="Only generate for sessions without videos or images"
                />

                <Box sx={{ mt: 1, mb: 1 }}>
                    <Button
                        variant="outlined"
                        size="small"
                        disabled={disabledButton || sessionToGenerateFor.length === 0}
                        onClick={runMediaCheck}
                        sx={{ mr: 1 }}>
                        {mediaCheckResult.checking ? (
                            <>
                                Checking media...
                                <CircularProgress size={16} sx={{ ml: 1 }} />
                            </>
                        ) : (
                            'Check media accessibility'
                        )}
                    </Button>
                    {mediaCheckResult.checked && mediaCheckResult.inaccessibleUrls.length === 0 && (
                        <Alert severity="success" sx={{ mt: 1 }}>
                            All media URLs are accessible.
                        </Alert>
                    )}
                    {mediaCheckResult.checked && mediaCheckResult.inaccessibleUrls.length > 0 && (
                        <Alert severity="warning" sx={{ mt: 1 }}>
                            <Typography variant="body2" fontWeight="bold">
                                The following media URLs are not accessible and may cause generation failures:
                            </Typography>
                            {mediaCheckResult.inaccessibleUrls.map((r) => (
                                <Typography key={r.url} variant="body2" sx={{ wordBreak: 'break-all' }}>
                                    • {r.url}
                                    {r.status ? ` (HTTP ${r.status})` : ''}
                                    {r.error ? ` — ${r.error}` : ''}
                                </Typography>
                            ))}
                        </Alert>
                    )}
                </Box>

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
                    disabled={disabledButton || sessionToGenerateFor.length === 0}
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

                {sessionToGenerateFor.length === 0 && (
                    <Typography color="text.secondary" sx={{ mt: 2 }}>
                        No sessions to generate.{' '}
                        {onlyMissingChecked ? 'All sessions already have videos.' : 'No sessions with speakers found.'}
                    </Typography>
                )}

                {generatingState.generationState === GenerationStates.ERROR && (
                    <Typography color="error">{generatingState.message}</Typography>
                )}
                {finalGeneration.generatingState.generationState === GenerationStates.ERROR && (
                    <Typography color="error">{finalGeneration.generatingState.message}</Typography>
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
