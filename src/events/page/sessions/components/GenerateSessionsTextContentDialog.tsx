import { Event, Session } from '../../../../types'
import { Box, Button, CircularProgress, Dialog, DialogContent, Typography } from '@mui/material'
import * as React from 'react'
import {
    GenerationStates,
    useSessionsGenerationGeneric,
} from '../../../actions/sessions/generation/useSessionsGenerationGeneric'
import {
    generateSessionTeasingTexts,
    GenerateSessionTeasingTextsSettings,
    GeneratedSessionTeasingTextAnswer,
} from '../../../actions/sessions/generation/generateSessionTeasingTexts'
import { GenerateSessionsTeasingContentPrompts } from '../../../actions/sessions/generation/generateSessionTeasingContent'
import { useNotification } from '../../../../hooks/notificationHook'

export const GenerateSessionsTextContentDialog = ({
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
    onSuccess?: (texts: { [socialNetworkName: string]: string }) => void
    forceGenerate?: boolean
}) => {
    const { createNotification } = useNotification()
    const llmSettings: GenerateSessionTeasingTextsSettings = {
        prompts: GenerateSessionsTeasingContentPrompts,
        openApiKey: event.openAPIKey,
    }

    const { generatingState, generate } = useSessionsGenerationGeneric<
        GenerateSessionTeasingTextsSettings,
        GeneratedSessionTeasingTextAnswer
    >(event, generateSessionTeasingTexts)
    const finalGeneration = useSessionsGenerationGeneric<
        GenerateSessionTeasingTextsSettings,
        GeneratedSessionTeasingTextAnswer
    >(event, generateSessionTeasingTexts)

    const sessionToGenerateFor = sessions

    const generateAll = () => {
        const updateDoc = !onSuccess
        finalGeneration.generate(sessionToGenerateFor, updateDoc, llmSettings).then(({ results, success }) => {
            if (onSuccess && success && results.length) {
                onSuccess(results[0].updatedSession.teasingPosts)
            }
            onClose()
            createNotification('Generation done, sessions updated!', { type: 'success' })
        })
    }

    const generateAllText = `Generate content on ${sessionToGenerateFor.length} sessions (takes times)`

    const generateAllButton = (
        <Button
            variant="contained"
            disabled={finalGeneration.generatingState.generationState === GenerationStates.GENERATING}
            onClick={generateAll}>
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
    )

    return (
        <Dialog open={isOpen} onClose={onClose} maxWidth="lg" fullWidth={true} scroll="body">
            <DialogContent sx={{ minHeight: '80vh' }}>
                <Typography variant="h5">Generate media content for sessions</Typography>
                <Typography>
                    This will do generate post content using OpenAI ChatGPT3.5-turbo (through OpenAI ChatGPT API)
                    <br />
                </Typography>

                {!event.openAPIKey && (
                    <Typography>
                        You need to set up an OpenRouter.ai API key in the event settings to use this feature.
                        <Button href="/settings">Go to event settings</Button>
                    </Typography>
                )}

                {!forceGenerate && (
                    <Button
                        variant="outlined"
                        disabled={generatingState.generationState === GenerationStates.GENERATING}
                        sx={{ marginRight: 2 }}
                        onClick={() => generate(sessionToGenerateFor.slice(0, 1), false, llmSettings)}>
                        {generatingState.generationState === 'GENERATING' ? (
                            <>
                                Generating...
                                <CircularProgress />
                            </>
                        ) : (
                            'Generate preview'
                        )}
                        {generatingState.progress && ` (${generatingState.progress})`}
                    </Button>
                )}
                {generateAllButton}

                {generatingState.generationState === GenerationStates.ERROR && (
                    <Typography color="error">{generatingState.message}</Typography>
                )}
                {generatingState.generationState === GenerationStates.SUCCESS && (
                    <>
                        <Typography color="success">{generatingState.message}</Typography>

                        <Box padding={2} border={1} borderColor="#66666688" borderRadius={4} margin={2}>
                            {generatingState.results &&
                                generatingState.results.results.flatMap((result, index) => {
                                    return (
                                        result.updatedSession.teasingPosts &&
                                        Object.keys(result.updatedSession.teasingPosts).map((social) => {
                                            const teasingPost = result.updatedSession.teasingPosts
                                            const socialWithType = social as keyof typeof teasingPost
                                            const postText =
                                                teasingPost && teasingPost[socialWithType]
                                                    ? teasingPost[socialWithType]
                                                    : '???'
                                            return (
                                                <Box key={social + index}>
                                                    <Typography key={index} variant="h6">
                                                        • {social}
                                                    </Typography>
                                                    <Typography>{postText}</Typography>
                                                </Box>
                                            )
                                        })
                                    )
                                })}
                        </Box>

                        {generateAllButton}
                    </>
                )}
            </DialogContent>
        </Dialog>
    )
}
